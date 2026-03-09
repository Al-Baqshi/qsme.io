"""Turn raw page text or PDF dict into layout-preserving blocks: table, note, dimensions, paragraph."""

from __future__ import annotations

import re
from typing import Any


def _poly_to_bbox(poly: list | Any) -> list[float] | None:
    """Convert 4-point polygon [[x,y],...] or rec_boxes row to [x1,y1,x2,y2]. Returns None if invalid."""
    try:
        if hasattr(poly, "__iter__") and not isinstance(poly, (str, dict)):
            pts = list(poly)
            if len(pts) >= 4:
                if isinstance(pts[0], (list, tuple)):
                    xs = [p[0] for p in pts if len(p) >= 2]
                    ys = [p[1] for p in pts if len(p) >= 2]
                else:
                    xs = [pts[0], pts[2]] if len(pts) >= 4 else []
                    ys = [pts[1], pts[3]] if len(pts) >= 4 else []
                if xs and ys:
                    return [float(min(xs)), float(min(ys)), float(max(xs)), float(max(ys))]
    except (TypeError, IndexError):
        pass
    return None


def _normalize_bbox(bbox: list[float], width: float, height: float) -> list[float]:
    """Normalize bbox [x1,y1,x2,y2] to 0-1 range."""
    if not width or not height:
        return bbox
    return [
        bbox[0] / width,
        bbox[1] / height,
        bbox[2] / width,
        bbox[3] / height,
    ]


def _block_type_from_text(text: str) -> str:
    """Classify a block by keywords so AI and UI can treat dimensions/notes distinctly."""
    lower = text.strip().lower()[:500]
    if re.search(r"\b(dimension|scale|schedule|measurement|length|width|height)\s*[:\s]", lower) or re.search(
        r"\d+\s*(m|mm|cm|ft|in)[\s\)]", lower
    ):
        return "dimensions"
    if re.search(r"\b(note|general notes|specification|memorandum|easement)\b", lower):
        return "note"
    return "paragraph"


def _is_list_block(lines: list[str]) -> bool:
    """True if lines look like a bulleted or numbered list (majority match)."""
    if len(lines) < 2:
        return False
    bullet = re.compile(r"^\s*[•·\-*]\s+")
    numbered = re.compile(r"^\s*\d+[.)]\s+")
    matches = 0
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if bullet.match(line) or numbered.match(line):
            matches += 1
    # Require at least 2 list-like lines and majority
    return matches >= 2 and matches >= 0.6 * len([x for x in lines if x.strip()])


def _list_items(lines: list[str]) -> list[str]:
    """Strip bullet/number prefix and return list of item strings."""
    bullet = re.compile(r"^\s*[•·\-*]\s+")
    numbered = re.compile(r"^\s*\d+[.)]\s+")
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if bullet.search(line):
            out.append(bullet.sub("", line).strip())
        elif numbered.search(line):
            out.append(numbered.sub("", line).strip())
        else:
            out.append(stripped)
    return out


def _lines_to_table(lines: list[str]) -> list[list[str]] | None:
    """If lines look like a table (same column count when splitting by 2+ spaces or tabs), return rows.
    Normalizes column count (pads with '') so tables with a missing Rev. column still show 3 columns when some rows have it."""
    if len(lines) < 2:
        return None
    rows = []
    for line in lines:
        cells = re.split(r"\t|[ ]{2,}", line.strip())
        cells = [c.strip() for c in cells if c.strip()]
        if not cells:
            continue
        rows.append(cells)
    if len(rows) < 2:
        return None
    max_cols = max(len(r) for r in rows)
    if max_cols < 2:
        return None
    # Pad rows to max_cols
    normalized = [r + [""] * (max_cols - len(r)) if len(r) <= max_cols else r[:max_cols] for r in rows]
    # If we have only 2 columns but second column often ends with " Word" or " X" (Rev.), split into 3 cols
    rev_suffix = re.compile(r"^(.+?)\s+([A-Z0-9])\s*$", re.IGNORECASE)
    if max_cols == 2:
        with_rev = []
        for row in normalized:
            if len(row) >= 2 and rev_suffix.match(row[1]):
                m = rev_suffix.match(row[1])
                if m:
                    with_rev.append([row[0], m.group(1).strip(), m.group(2)])
                else:
                    with_rev.append(row + [""])
            else:
                with_rev.append(row + [""])
        normalized = with_rev
    return normalized


def _sheet_index_style_table(lines: list[str]) -> list[list[str]] | None:
    """When OCR/PDF outputs Sheet Index as one cell per line (ID, Layout Name, Rev., ...), group into rows of 3 (ID, Layout Name, Rev.)."""
    if len(lines) < 4:
        return None
    id_re = re.compile(r"^(RC\d+|A\d+|\d+)\s*$", re.IGNORECASE)
    rev_re = re.compile(r"^[A-Z0-9]{1,3}\s*$", re.IGNORECASE)  # Rev.: single letter or short code
    rows: list[list[str]] = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if id_re.match(line):
            cell_id = line
            i += 1
            name_parts = []
            while i < len(lines):
                next_ln = lines[i].strip()
                if not next_ln:
                    i += 1
                    continue
                if id_re.match(next_ln):
                    break
                if rev_re.match(next_ln) and len(name_parts) >= 1:
                    rows.append([cell_id, " ".join(name_parts).strip() or "", next_ln.strip()])
                    i += 1
                    break
                name_parts.append(next_ln)
                i += 1
            else:
                if name_parts:
                    rows.append([cell_id, " ".join(name_parts).strip(), ""])
        else:
            i += 1
    return rows if len(rows) >= 2 else None


def structured_blocks_from_pdf_dict(d: dict, page_height: float | None = None) -> list[dict[str, Any]]:
    """Build structured blocks from PyMuPDF page.get_text('dict') result.
    Tables, lists, and text blocks (paragraph/note/dimensions) only; no footer classification.
    """
    blocks_out: list[dict[str, Any]] = []
    raw_blocks = d.get("blocks") or []
    for blk in raw_blocks:
        lines_list = blk.get("lines") or []
        line_texts = []
        for line in lines_list:
            spans = line.get("spans") or []
            line_str = " ".join(s.get("text", "") for s in spans).strip()
            if line_str:
                line_texts.append(line_str)
        if not line_texts:
            continue
        full_text = "\n".join(line_texts)
        as_table = _lines_to_table(line_texts)
        if as_table is None and len(line_texts) >= 4:
            as_table = _sheet_index_style_table(line_texts)
        if as_table is not None:
            blocks_out.append({"type": "table", "content": as_table})
        elif _is_list_block(line_texts):
            blocks_out.append({"type": "list", "content": _list_items(line_texts)})
        else:
            block_type = _block_type_from_text(full_text)
            blocks_out.append({"type": block_type, "content": full_text})
    return blocks_out


def structured_blocks_from_plain_text(text: str) -> list[dict[str, Any]]:
    """When only plain text is available (e.g. OCR), split into paragraphs and detect tables/notes/dimensions/lists.
    For single-block text (no double newlines), tries table detection on all lines so image-based tables from OCR are parsed."""
    if not (text or text.strip()):
        return []
    blocks_out: list[dict[str, Any]] = []
    raw_paragraphs = re.split(r"\n\s*\n", text.strip())
    all_lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    # Single block with many lines: try whole-text table (helps OCR tables)
    if len(raw_paragraphs) <= 1 and len(all_lines) >= 4:
        as_table = _lines_to_table(all_lines)
        if as_table is None and ("sheet index" in text.lower() or re.search(r"RC\d+", text)):
            as_table = _sheet_index_style_table(all_lines)
        if as_table is not None:
            blocks_out.append({"type": "table", "content": as_table})
            return blocks_out
    for para in raw_paragraphs:
        para = para.strip()
        if not para:
            continue
        lines = [ln.strip() for ln in para.splitlines() if ln.strip()]
        as_table = _lines_to_table(lines) if len(lines) >= 2 else None
        if as_table is None and len(lines) >= 4 and ("sheet index" in para.lower() or re.search(r"RC\d+", para)):
            as_table = _sheet_index_style_table(lines)
        if as_table is None and len(lines) >= 3 and re.search(r"(lot|coverage|m²|%)\s+\d", para.lower()):
            as_table = _lines_to_table(lines)
        if as_table is not None:
            blocks_out.append({"type": "table", "content": as_table})
        elif _is_list_block(lines):
            blocks_out.append({"type": "list", "content": _list_items(lines)})
        else:
            block_type = _block_type_from_text(para)
            blocks_out.append({"type": block_type, "content": para})
    return blocks_out


def structured_blocks_from_paddle_structure(
    result: list | dict,
    img_width: float,
    img_height: float,
) -> tuple[list[dict[str, Any]], str]:
    """Parse PP-StructureV3 predict() output into structured blocks with bbox.
    Returns (blocks, full_text). Falls back to empty blocks and empty text on parse error.
    """
    blocks_out: list[dict[str, Any]] = []
    full_text_parts: list[str] = []

    def _get(obj: Any, *keys: str, default: Any = None) -> Any:
        for k in keys:
            if isinstance(obj, dict) and k in obj:
                obj = obj[k]
            else:
                return default
        return obj

    try:
        # Result can be list of Result objects or list of dicts
        first = result[0] if result else {}
        res = first.get("res", first) if isinstance(first, dict) else getattr(first, "json", getattr(first, "res", first))
        if not isinstance(res, dict):
            res = getattr(res, "__dict__", {}) or {}

        layout_boxes = _get(res, "layout_det_res", "boxes") or []
        if hasattr(layout_boxes, "tolist"):
            layout_boxes = layout_boxes.tolist()
        layout_boxes = list(layout_boxes) if layout_boxes else []
        # Reading order: top-to-bottom (y1), then left-to-right (x1)
        layout_boxes = sorted(
            layout_boxes,
            key=lambda b: (
                b.get("coordinate", [0, 0, 0, 0])[1] if isinstance(b, dict) else 0,
                b.get("coordinate", [0, 0, 0, 0])[0] if isinstance(b, dict) else 0,
            ),
        )
        overall_ocr = _get(res, "overall_ocr_res") or {}
        rec_texts = overall_ocr.get("rec_texts") if isinstance(overall_ocr, dict) else getattr(overall_ocr, "rec_texts", [])
        rec_polys = overall_ocr.get("rec_polys") if isinstance(overall_ocr, dict) else getattr(overall_ocr, "rec_polys", None)
        rec_boxes = overall_ocr.get("rec_boxes") if isinstance(overall_ocr, dict) else getattr(overall_ocr, "rec_boxes", None)

        if rec_texts:
            full_text_parts.append("\n".join(t for t in rec_texts if t))

        # Layout boxes: each has label, coordinate [x1,y1,x2,y2], score
        label_to_block: dict[str, str] = {
            "table": "table",
            "text": "paragraph",
            "paragraph_title": "paragraph",
            "doc_title": "paragraph",
            "figure_title": "paragraph",
            "figure_caption": "paragraph",
            "list": "list",
        }

        # Table recognition results - may be under table_rec_res or similar
        table_regions: list[dict] = []
        for key in ("table_rec_res", "table_res", "table_cell"):
            tr = _get(res, key)
            if tr:
                break

        for box in layout_boxes:
            if not isinstance(box, dict):
                continue
            label = box.get("label", "text")
            score = box.get("score")
            score_value = float(score) if isinstance(score, (int, float)) else None
            coord = box.get("coordinate")
            if not coord or len(coord) < 4:
                continue
            x1, y1, x2, y2 = coord[0], coord[1], coord[2], coord[3]
            bbox_norm = _normalize_bbox([x1, y1, x2, y2], img_width, img_height)

            # Match OCR lines inside this box (rec_polys/rec_boxes + rec_texts)
            box_texts: list[str] = []
            if rec_texts and (rec_polys is not None or rec_boxes is not None):
                texts = list(rec_texts) if isinstance(rec_texts, (list, tuple)) else []
                polys = rec_polys
                if polys is None and rec_boxes is not None:
                    try:
                        import numpy as np
                        rb = rec_boxes
                        if hasattr(rb, "__iter__") and len(rb) > 0:
                            polys = [[r[0], r[1], r[2], r[1], r[2], r[3], r[0], r[3]] for r in rb]
                    except Exception:
                        polys = []
                if polys is not None and texts:
                    for i, poly in enumerate(polys):
                        if i >= len(texts):
                            break
                        pb = _poly_to_bbox(poly)
                        if pb and _box_overlaps(pb, [x1, y1, x2, y2]):
                            box_texts.append(texts[i])

            content_str = "\n".join(box_texts).strip() if box_texts else ""

            if label == "table":
                # Try to get table structure from table_rec_res
                table_rows = _extract_table_from_structure(res, box)
                if table_rows:
                    blocks_out.append(
                        {
                            "type": "table",
                            "content": table_rows,
                            "bbox": bbox_norm,
                            "layout_label": label,
                            "confidence": score_value,
                        }
                    )
                elif content_str:
                    as_table = _lines_to_table(content_str.splitlines())
                    if as_table:
                        blocks_out.append(
                            {
                                "type": "table",
                                "content": as_table,
                                "bbox": bbox_norm,
                                "layout_label": label,
                                "confidence": score_value,
                            }
                        )
                    else:
                        block_type = _block_type_from_text(content_str)
                        blocks_out.append(
                            {
                                "type": block_type,
                                "content": content_str,
                                "bbox": bbox_norm,
                                "layout_label": label,
                                "confidence": score_value,
                            }
                        )
                else:
                    continue
            elif (label or "").lower() == "figure":
                blocks_out.append(
                    {
                        "type": "figure",
                        "bbox": bbox_norm,
                        "layout_label": label,
                        "confidence": score_value,
                    }
                )
            elif label == "list" and content_str:
                lines = [ln.strip() for ln in content_str.splitlines() if ln.strip()]
                if _is_list_block(lines):
                    blocks_out.append(
                        {
                            "type": "list",
                            "content": _list_items(lines),
                            "bbox": bbox_norm,
                            "layout_label": label,
                            "confidence": score_value,
                        }
                    )
                else:
                    block_type = _block_type_from_text(content_str)
                    blocks_out.append(
                        {
                            "type": block_type,
                            "content": content_str,
                            "bbox": bbox_norm,
                            "layout_label": label,
                            "confidence": score_value,
                        }
                    )
            elif content_str:
                block_type = label_to_block.get(label, _block_type_from_text(content_str))
                blocks_out.append(
                    {
                        "type": block_type,
                        "content": content_str,
                        "bbox": bbox_norm,
                        "layout_label": label,
                        "confidence": score_value,
                    }
                )

        # Fallback: no layout boxes, use overall OCR with rec_polys for bbox per line
        if not blocks_out and rec_texts:
            texts = list(rec_texts) if isinstance(rec_texts, (list, tuple)) else []
            polys = rec_polys
            boxes = rec_boxes
            if hasattr(polys, "tolist"):
                polys = polys.tolist()
            if hasattr(boxes, "tolist"):
                boxes = boxes.tolist()
            for i, txt in enumerate(texts):
                if not (txt and str(txt).strip()):
                    continue
                bbox_norm = None
                if polys and i < len(polys):
                    pb = _poly_to_bbox(polys[i] if not hasattr(polys[i], "tolist") else polys[i].tolist())
                    if pb:
                        bbox_norm = _normalize_bbox(pb, img_width, img_height)
                elif boxes and i < len(boxes):
                    b = boxes[i]
                    if hasattr(b, "tolist"):
                        b = b.tolist()
                    pb = _poly_to_bbox(b)
                    if pb:
                        bbox_norm = _normalize_bbox(pb, img_width, img_height)
                blk: dict[str, Any] = {
                    "type": _block_type_from_text(str(txt)),
                    "content": str(txt).strip(),
                    "layout_label": "ocr_text",
                    "confidence": None,
                }
                if bbox_norm:
                    blk["bbox"] = bbox_norm
                blocks_out.append(blk)
    except Exception:
        pass

    # Reading order: top-to-bottom (bbox[1]), then left-to-right (bbox[0])
    blocks_out = sorted(
        blocks_out,
        key=lambda b: (
            b.get("bbox", [0, 0, 0, 0])[1] if b.get("bbox") and len(b["bbox"]) >= 2 else 0,
            b.get("bbox", [0, 0, 0, 0])[0] if b.get("bbox") and len(b["bbox"]) >= 1 else 0,
        ),
    )

    full_text = "\n\n".join(p for p in full_text_parts if p).strip()
    return blocks_out, full_text


def _box_overlaps(inner: list[float], outer: list[float], tol: float = 10.0) -> bool:
    """True if inner bbox overlaps outer (x1,y1,x2,y2)."""
    if len(inner) < 4 or len(outer) < 4:
        return False
    ix1, iy1, ix2, iy2 = inner[0], inner[1], inner[2], inner[3]
    ox1, oy1, ox2, oy2 = outer[0], outer[1], outer[2], outer[3]
    cx = (ix1 + ix2) / 2
    cy = (iy1 + iy2) / 2
    return ox1 - tol <= cx <= ox2 + tol and oy1 - tol <= cy <= oy2 + tol


def _extract_table_from_structure(res: dict, box: dict) -> list[list[str]] | None:
    """Extract table rows from PP-StructureV3 table recognition output if available."""
    if not isinstance(res, dict):
        return None
    for key in ("table_rec_res", "table_res", "text_paragraphs_ocr_res"):
        tr = res.get(key)
        if not tr:
            continue
        if isinstance(tr, list):
            for item in tr:
                if isinstance(item, dict):
                    rows = item.get("res") or item.get("content") or item.get("cells")
                    if rows and isinstance(rows, list):
                        out = []
                        for row in rows:
                            if isinstance(row, list):
                                out.append([str(c) for c in row])
                            elif isinstance(row, dict):
                                out.append([str(row.get("text", row.get("content", "")))])
                        if len(out) >= 2:
                            return out
        elif isinstance(tr, dict):
            rows = tr.get("res") or tr.get("content") or tr.get("cells")
            if rows and isinstance(rows, list):
                out = []
                for row in rows:
                    if isinstance(row, list):
                        out.append([str(c) for c in row])
                    elif isinstance(row, dict):
                        out.append([str(row.get("text", row.get("content", "")))])
                if len(out) >= 2:
                    return out
    return None


def structured_blocks_from_paddle_basic(
    result: list | dict,
    img_width: float,
    img_height: float,
) -> tuple[list[dict[str, Any]], str]:
    """Parse basic PaddleOCR predict() output into blocks with bbox from rec_polys/rec_boxes.
    Returns (blocks, full_text). Groups consecutive lines into paragraphs when y-proximity is close."""
    blocks_out: list[dict[str, Any]] = []
    full_text_parts: list[str] = []

    try:
        first = result[0] if result else {}
        res = first.get("res", first) if isinstance(first, dict) else first
        if not isinstance(res, dict):
            res = getattr(res, "__dict__", {}) or {}
        # Basic PaddleOCR: rec_texts, rec_polys, rec_boxes at top level of result[0]
        rec_texts = res.get("rec_texts", [])
        rec_polys = res.get("rec_polys")
        rec_boxes = res.get("rec_boxes")
        if rec_polys is None and rec_boxes is not None:
            try:
                rb = rec_boxes
                if hasattr(rb, "__iter__"):
                    rec_polys = []
                    for r in rb:
                        if hasattr(r, "tolist"):
                            r = r.tolist()
                        if isinstance(r, (list, tuple)) and len(r) >= 4:
                            rec_polys.append([[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]])
            except Exception:
                rec_polys = []

        if not rec_texts:
            return [], ""

        texts = list(rec_texts) if isinstance(rec_texts, (list, tuple)) else []
        full_text_parts.append("\n".join(t for t in texts if t))

        polys = rec_polys
        if hasattr(polys, "tolist"):
            polys = polys.tolist()
        polys = list(polys) if polys else []

        # Build blocks: group lines by y-proximity (same paragraph) or emit per-line
        current_lines: list[str] = []
        current_bboxes: list[list[float]] = []
        last_y2 = -1
        para_gap = 20.0  # pixels

        for i, txt in enumerate(texts):
            if not (txt and str(txt).strip()):
                continue
            bbox = None
            if polys and i < len(polys):
                p = polys[i]
                if hasattr(p, "tolist"):
                    p = p.tolist()
                bbox = _poly_to_bbox(p)
            if bbox:
                y2 = bbox[3]
                if current_lines and last_y2 >= 0 and (y2 - last_y2) > para_gap:
                    content = "\n".join(current_lines).strip()
                    if content:
                        merged = _merge_bboxes(current_bboxes)
                        bbox_norm = _normalize_bbox(merged, img_width, img_height) if merged else None
                        blk: dict[str, Any] = {"type": _block_type_from_text(content), "content": content}
                        if bbox_norm:
                            blk["bbox"] = bbox_norm
                        blocks_out.append(blk)
                    current_lines = []
                    current_bboxes = []
                current_lines.append(str(txt).strip())
                current_bboxes.append(bbox)
                last_y2 = y2

        if current_lines:
            content = "\n".join(current_lines).strip()
            if content:
                merged = _merge_bboxes(current_bboxes)
                bbox_norm = _normalize_bbox(merged, img_width, img_height) if merged else None
                blk = {"type": _block_type_from_text(content), "content": content}
                if bbox_norm:
                    blk["bbox"] = bbox_norm
                blocks_out.append(blk)

        # Try table detection on blocks that look like tables
        for i, blk in enumerate(blocks_out):
            if blk.get("type") == "paragraph":
                c = blk.get("content", "")
                lines = [ln.strip() for ln in c.splitlines() if ln.strip()]
                as_table = _lines_to_table(lines) if len(lines) >= 2 else None
                if as_table is None and len(lines) >= 4:
                    as_table = _sheet_index_style_table(lines)
                if as_table:
                    blocks_out[i] = {"type": "table", "content": as_table, "bbox": blk.get("bbox")}
    except Exception:
        pass

    # Reading order: top-to-bottom (bbox[1]), then left-to-right (bbox[0])
    blocks_out = sorted(
        blocks_out,
        key=lambda b: (
            b.get("bbox", [0, 0, 0, 0])[1] if b.get("bbox") and len(b["bbox"]) >= 2 else 0,
            b.get("bbox", [0, 0, 0, 0])[0] if b.get("bbox") and len(b["bbox"]) >= 1 else 0,
        ),
    )

    full_text = "\n\n".join(p for p in full_text_parts if p).strip()
    return blocks_out, full_text


def _merge_bboxes(bboxes: list[list[float]]) -> list[float] | None:
    """Merge list of [x1,y1,x2,y2] into one enclosing bbox."""
    if not bboxes:
        return None
    xs1 = [b[0] for b in bboxes if len(b) >= 4]
    ys1 = [b[1] for b in bboxes if len(b) >= 4]
    xs2 = [b[2] for b in bboxes if len(b) >= 4]
    ys2 = [b[3] for b in bboxes if len(b) >= 4]
    if not xs1:
        return None
    return [min(xs1), min(ys1), max(xs2), max(ys2)]


def merge_pdf_tables_with_blocks(
    pdf_tables: list[list[list[str]]],
    blocks_from_dict_or_text: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """When PyMuPDF find_tables() found tables, prepend them and skip table-type blocks from dict/text to avoid duplication.
    Keeps non-table blocks from dict/text (list, paragraph, note, dimensions).
    """
    out: list[dict[str, Any]] = []
    for rows in pdf_tables:
        if rows and len(rows) >= 1:
            out.append({"type": "table", "content": rows})
    for blk in blocks_from_dict_or_text:
        if blk.get("type") != "table":
            out.append(blk)
    return out if out else blocks_from_dict_or_text
