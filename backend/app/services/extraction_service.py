from __future__ import annotations

import json
import os
import re
import tempfile
import uuid
from pathlib import Path
from typing import Any, Literal, Union
from uuid import UUID

import fitz
import pytesseract
from PIL import Image
from sqlalchemy.orm import Session

from app.models.database_models import Document, Page
from app.services.ai_assist_service import AIAssistService
from app.services.structured_extraction import (
    structured_blocks_from_paddle_basic,
    structured_blocks_from_paddle_structure,
)

PageType = Literal["floor_plan", "elevation", "section", "site_plan", "notes", "schedule"]

TITLE_RE = re.compile(r"\b(sheet|drawing|plan|floor plan|elevation|section|detail|title|scale)\b", re.IGNORECASE)


class ExtractionService:
    """PDF extraction pipeline: store, split, render, text extract/OCR, classify pages."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.storage_root = Path(os.getenv("OBJECT_STORAGE_DIR", "/tmp/qsme-object-storage"))
        self.storage_prefix = os.getenv("OBJECT_STORAGE_PREFIX", "object://qsme")
        self.storage_root.mkdir(parents=True, exist_ok=True)
        self.ai_assist = AIAssistService()
        self._paddle_ocr = None
        self._paddle_structure = None  # Lazy-init when PADDLE_OCR_MODE=structure

    def _run_ocr(self, image: Image.Image) -> str:
        """Run OCR on a page image. Uses PaddleOCR when USE_PADDLE_OCR=true, else Tesseract. Fallback to Tesseract on Paddle failure."""
        use_paddle = os.getenv("USE_PADDLE_OCR", "false").strip().lower() == "true"
        if use_paddle:
            try:
                text = self._ocr_with_paddle(image)
                if text:
                    return text
            except Exception:
                pass
        return (pytesseract.image_to_string(image) or "").strip()

    def _to_json_safe(self, obj: Any) -> Any:
        """Convert object to JSON-serializable form (numpy arrays, etc.)."""
        if hasattr(obj, "tolist"):
            return obj.tolist()
        if isinstance(obj, dict):
            return {k: self._to_json_safe(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [self._to_json_safe(v) for v in obj]
        if isinstance(obj, (str, int, float, bool, type(None))):
            return obj
        return str(obj)

    def _run_ocr_with_structure(
        self, image: Image.Image
    ) -> tuple[list[dict], str, dict | None]:
        """Run PP-StructureV3 on image. Returns (structured_blocks, full_text, raw_result). raw_result is JSON-serializable for JSON tab."""
        if self._paddle_structure is None:
            try:
                from paddleocr import PPStructureV3
                self._paddle_structure = PPStructureV3(
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                    use_formula_recognition=os.getenv("USE_FORMULA_RECOGNITION", "false").strip().lower() == "true",
                )
            except Exception:
                self._paddle_structure = False
        if self._paddle_structure is False:
            return [], "", None
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            try:
                image.save(f.name, format="PNG")
                result = self._paddle_structure.predict(f.name)
            finally:
                try:
                    os.unlink(f.name)
                except Exception:
                    pass
        if not result or len(result) == 0:
            return [], "", None
        w, h = image.size
        blocks, full_text = structured_blocks_from_paddle_structure(result, float(w), float(h))
        raw_result: dict | None = None
        try:
            raw_result = self._to_json_safe(result)
            json.dumps(raw_result)  # validate serializable
        except Exception:
            raw_result = {"structuredContent": blocks}
        return blocks, full_text, raw_result

    def _ocr_with_paddle(self, image: Image.Image) -> str:
        """Run PaddleOCR on image; returns concatenated rec_texts or empty string."""
        if self._paddle_ocr is None:
            try:
                from paddleocr import PaddleOCR
                self._paddle_ocr = PaddleOCR(
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                )
            except Exception:
                self._paddle_ocr = False
        if self._paddle_ocr is False:
            return ""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            try:
                image.save(f.name, format="PNG")
                result = self._paddle_ocr.predict(f.name)
            finally:
                try:
                    os.unlink(f.name)
                except Exception:
                    pass
        if not result or len(result) == 0:
            return ""
        first = result[0]
        rec_texts = first.get("rec_texts", []) if isinstance(first, dict) else getattr(first, "rec_texts", [])
        if not rec_texts:
            return ""
        return "\n".join(t for t in rec_texts if t).strip()

    def _run_ocr_with_paddle_basic(
        self, image: Image.Image
    ) -> tuple[list[dict], str]:
        """Run basic PaddleOCR and return (blocks_with_bbox, full_text). Empty on failure."""
        if self._paddle_ocr is None:
            try:
                from paddleocr import PaddleOCR
                self._paddle_ocr = PaddleOCR(
                    use_doc_orientation_classify=False,
                    use_doc_unwarping=False,
                    use_textline_orientation=False,
                )
            except Exception:
                self._paddle_ocr = False
        if self._paddle_ocr is False:
            return [], ""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            try:
                image.save(f.name, format="PNG")
                result = self._paddle_ocr.predict(f.name)
            finally:
                try:
                    os.unlink(f.name)
                except Exception:
                    pass
        if not result or len(result) == 0:
            return [], ""
        w, h = image.size
        return structured_blocks_from_paddle_basic(result, float(w), float(h))

    def _normalize_bbox(self, bbox: list[float], width: float, height: float) -> list[float]:
        if not bbox or len(bbox) < 4 or not width or not height:
            return [0.0, 0.0, 0.0, 0.0]
        x1, y1, x2, y2 = bbox[:4]
        return [
            max(0.0, min(1.0, x1 / width)),
            max(0.0, min(1.0, y1 / height)),
            max(0.0, min(1.0, x2 / width)),
            max(0.0, min(1.0, y2 / height)),
        ]

    def _bbox_area(self, bbox: list[float]) -> float:
        if not bbox or len(bbox) < 4:
            return 0.0
        return max(0.0, bbox[2] - bbox[0]) * max(0.0, bbox[3] - bbox[1])

    def _bbox_overlaps(self, a: list[float], b: list[float], tol: float = 0.0) -> bool:
        if not a or not b or len(a) < 4 or len(b) < 4:
            return False
        return not (
            a[2] + tol < b[0]
            or a[0] - tol > b[2]
            or a[3] + tol < b[1]
            or a[1] - tol > b[3]
        )

    def _union_bboxes(self, bboxes: list[list[float]]) -> list[float] | None:
        if not bboxes:
            return None
        xs1 = [b[0] for b in bboxes if len(b) >= 4]
        ys1 = [b[1] for b in bboxes if len(b) >= 4]
        xs2 = [b[2] for b in bboxes if len(b) >= 4]
        ys2 = [b[3] for b in bboxes if len(b) >= 4]
        if not xs1 or not ys1 or not xs2 or not ys2:
            return None
        return [min(xs1), min(ys1), max(xs2), max(ys2)]

    def _normalize_whitespace(self, text: str) -> str:
        return re.sub(r"\s+", " ", text or "").strip()

    def _standardize_units(self, text: str) -> str:
        out = text or ""
        out = re.sub(r"\bfeet\b|\bfoot\b", "ft", out, flags=re.IGNORECASE)
        out = re.sub(r"\bmeters?\b|\bmetres?\b", "m", out, flags=re.IGNORECASE)
        out = re.sub(r"\bcentimeters?\b|\bcentimetres?\b", "cm", out, flags=re.IGNORECASE)
        out = re.sub(r"\bmillimeters?\b|\bmillimetres?\b", "mm", out, flags=re.IGNORECASE)
        out = re.sub(r"(\d+)\s*'\s*(\d+(?:\.\d+)?)\s*\"?", r"\1 ft \2 in", out)
        out = re.sub(r"(?<=\d)\s*[\"”]", " in", out)
        out = re.sub(r"(?<=\d)\s*['′]", " ft", out)
        out = re.sub(r"(\d)(mm|cm|m|ft|in)\b", r"\1 \2", out, flags=re.IGNORECASE)
        return out

    def _fix_dimension_ocr(self, text: str) -> str:
        out = text or ""
        out = re.sub(r"(?<=\d)[oO](?=\d)", "0", out)
        out = re.sub(r"(?<=\d)[Il](?=\d)", "1", out)
        out = re.sub(r"(?<=\d)[S](?=\d)", "5", out)
        out = re.sub(r"(?<=\d)[B](?=\d)", "8", out)
        return out

    def _normalize_text(self, text: str) -> str:
        if not text:
            return ""
        out = self._fix_dimension_ocr(text)
        out = self._standardize_units(out)
        out = self._normalize_whitespace(out)
        return out

    def _is_title_text(self, text: str) -> bool:
        return bool(TITLE_RE.search(text or ""))

    def _extract_embedded_text_blocks(self, page: fitz.Page) -> list[dict[str, Any]]:
        blocks_out: list[dict[str, Any]] = []
        page_dict = page.get_text("dict") or {}
        width = float(getattr(page.rect, "width", 0) or 0)
        height = float(getattr(page.rect, "height", 0) or 0)
        for blk in page_dict.get("blocks", []) or []:
            if blk.get("type") != 0:
                continue
            bbox = blk.get("bbox")
            if not bbox or len(bbox) < 4:
                continue
            lines = []
            font_sizes: list[float] = []
            for line in blk.get("lines") or []:
                spans = line.get("spans") or []
                line_text = " ".join((s.get("text") or "") for s in spans).strip()
                if line_text:
                    lines.append(line_text)
                for span in spans:
                    size = span.get("size")
                    if isinstance(size, (int, float)):
                        font_sizes.append(float(size))
            if not lines:
                continue
            raw_text = "\n".join(lines).strip()
            avg_size = sum(font_sizes) / len(font_sizes) if font_sizes else None
            blocks_out.append(
                {
                    "bbox": self._normalize_bbox(bbox, width, height),
                    "raw_text": raw_text,
                    "line_count": len(lines),
                    "avg_font_size": avg_size,
                }
            )
        return blocks_out

    def _embedded_region_type(self, text: str, bbox: list[float], avg_font_size: float | None) -> str:
        if self._is_title_text(text):
            return "title_blocks"
        if avg_font_size is not None and avg_font_size >= 14:
            return "title_blocks"
        if bbox and len(bbox) >= 4 and bbox[1] > 0.8 and len(text.strip()) <= 120:
            return "title_blocks"
        return "text_blocks"

    def _extract_embedded_table_blocks(self, page: fitz.Page) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        width = float(getattr(page.rect, "width", 0) or 0)
        height = float(getattr(page.rect, "height", 0) or 0)
        try:
            finder = page.find_tables()
            tables = getattr(finder, "tables", None) or []
        except Exception:
            tables = []
        for t in tables:
            try:
                rows = t.extract()
            except Exception:
                rows = None
            if not rows:
                continue
            table_rows = [[str(c) if c is not None else "" for c in row] for row in rows]
            bbox = None
            rect = getattr(t, "bbox", None) or getattr(t, "rect", None)
            if rect is not None:
                try:
                    bbox = [float(rect[0]), float(rect[1]), float(rect[2]), float(rect[3])]
                except Exception:
                    bbox = None
            if bbox is None:
                bbox = [0.0, 0.0, width, height]
            out.append({"bbox": self._normalize_bbox(bbox, width, height), "table": table_rows})
        return out

    def _region_type_from_layout(self, label: str, block_type: str) -> str:
        label_lower = (label or "").lower()
        if label_lower in {"doc_title", "paragraph_title", "title"}:
            return "title_blocks"
        if label_lower in {"figure_caption", "figure_title"}:
            return "figure_blocks"
        if label_lower == "table" or block_type == "table":
            return "table_blocks"
        if label_lower == "figure" or block_type == "figure":
            return "image_blocks"
        return "text_blocks"

    def _ocr_region_lines(
        self,
        image: Image.Image,
        region_bbox: list[float],
        page_width_px: int,
        page_height_px: int,
    ) -> list[dict[str, Any]]:
        x1 = int(max(0.0, region_bbox[0]) * page_width_px)
        y1 = int(max(0.0, region_bbox[1]) * page_height_px)
        x2 = int(min(1.0, region_bbox[2]) * page_width_px)
        y2 = int(min(1.0, region_bbox[3]) * page_height_px)
        if x2 <= x1 or y2 <= y1:
            return []
        crop = image.crop((x1, y1, x2, y2))
        try:
            data = pytesseract.image_to_data(crop, output_type=pytesseract.Output.DICT)
        except Exception:
            data = None
        if not data or "text" not in data:
            text = (pytesseract.image_to_string(crop) or "").strip()
            if not text:
                return []
            return [
                {
                    "text": text,
                    "bbox": region_bbox,
                    "confidence": 0.5,
                }
            ]
        lines: dict[tuple[int, int, int], dict[str, Any]] = {}
        count = len(data.get("text", []))
        for i in range(count):
            word = (data["text"][i] or "").strip()
            if not word:
                continue
            try:
                conf = float(data.get("conf", [])[i])
            except (TypeError, ValueError):
                conf = -1.0
            left = int(data.get("left", [0])[i])
            top = int(data.get("top", [0])[i])
            width = int(data.get("width", [0])[i])
            height = int(data.get("height", [0])[i])
            key = (
                int(data.get("block_num", [0])[i]),
                int(data.get("par_num", [0])[i]),
                int(data.get("line_num", [0])[i]),
            )
            entry = lines.setdefault(
                key,
                {"words": [], "confs": [], "bbox": [left, top, left + width, top + height]},
            )
            entry["words"].append(word)
            if conf >= 0:
                entry["confs"].append(conf)
            bbox = entry["bbox"]
            bbox[0] = min(bbox[0], left)
            bbox[1] = min(bbox[1], top)
            bbox[2] = max(bbox[2], left + width)
            bbox[3] = max(bbox[3], top + height)

        out: list[dict[str, Any]] = []
        for entry in lines.values():
            words = entry.get("words") or []
            if not words:
                continue
            line_text = " ".join(words).strip()
            if not line_text:
                continue
            confs = entry.get("confs") or []
            confidence = sum(confs) / len(confs) / 100.0 if confs else 0.5
            bbox = entry.get("bbox", [0, 0, 0, 0])
            line_bbox = [
                (x1 + bbox[0]) / page_width_px,
                (y1 + bbox[1]) / page_height_px,
                (x1 + bbox[2]) / page_width_px,
                (y1 + bbox[3]) / page_height_px,
            ]
            out.append({"text": line_text, "bbox": line_bbox, "confidence": confidence})
        return out

    def _table_to_markdown(self, rows: list[list[str]]) -> str:
        """Convert table rows to pipe markdown."""
        if not rows:
            return ""
        escape = lambda s: str(s).replace("|", "\\|").replace("\n", " ")
        header = "| " + " | ".join(escape(c) for c in rows[0]) + " |"
        sep = "| " + " | ".join("---" for _ in rows[0]) + " |"
        body = [header, sep]
        for row in rows[1:]:
            body.append("| " + " | ".join(escape(c) for c in row) + " |")
        return "\n".join(body)

    def _table_to_html(self, headers: list[str], rows: list[list[str]]) -> str:
        """Convert headers + data rows to simple HTML table."""
        import html
        def esc(s: str) -> str:
            return html.escape(str(s))
        parts = ["<table>"]
        if headers:
            parts.append("<thead><tr>")
            for h in headers:
                parts.append(f"<th>{esc(h)}</th>")
            parts.append("</tr></thead>")
        parts.append("<tbody>")
        for row in rows:
            parts.append("<tr>")
            for c in row:
                parts.append(f"<td>{esc(c)}</td>")
            parts.append("</tr>")
        parts.append("</tbody></table>")
        return "".join(parts)

    def _infer_table_title(self, raw_text: str) -> Optional[str]:
        """Infer table title from raw text (e.g. Sheet Index, Schedule)."""
        lower = (raw_text or "").lower()
        if "sheet index" in lower:
            return "Sheet Index"
        if "door schedule" in lower:
            return "Door Schedule"
        if "window schedule" in lower:
            return "Window Schedule"
        if "finish schedule" in lower:
            return "Finish Schedule"
        if "schedule" in lower and len(raw_text or "") < 80:
            return (raw_text or "").strip().split("\n")[0].strip() or None
        return None

    def _enrich_table_region(self, item: dict[str, Any]) -> None:
        """Mutate item: set title, headers, rows, markdown, html for table_blocks."""
        if item.get("region_type") != "table_blocks":
            return
        table = item.get("table")
        if not table or not isinstance(table, list):
            return
        rows = [list(map(str, row)) for row in table if isinstance(row, (list, tuple))]
        if not rows:
            return
        item["headers"] = rows[0]
        item["rows"] = rows[1:]
        item["title"] = item.get("title") or self._infer_table_title(item.get("raw_text", ""))
        item["markdown"] = self._table_to_markdown(rows)
        item["html"] = self._table_to_html(rows[0], rows[1:])

    def _crop_image_regions(
        self,
        structured_items: list[dict[str, Any]],
        image: Image.Image,
        document_id: UUID,
        page_number: int,
    ) -> None:
        """Crop image/figure regions, save to storage, set figureIndex and image_url. Mutates items."""
        idx = 0
        for item in structured_items:
            if not isinstance(item, dict):
                continue
            if item.get("region_type") not in ("image_blocks", "figure_blocks"):
                continue
            bbox = item.get("bbox")
            if not bbox or len(bbox) < 4:
                continue
            try:
                uri = self._store_figure_crop(document_id, page_number, idx, image, bbox)
                if uri:
                    item["figureIndex"] = idx
                    # Relative path for API: client can use base + /pages/{page_id}/figures/{figureIndex}
                    item["image_url"] = f"figures/page-{page_number}-{idx}.png"
                    idx += 1
            except Exception:
                pass

    def migrate_page_structured_content(self, page: Page) -> bool:
        """Backfill region ids and table fields on existing structured_content. Mutates page in place; caller must commit.
        Returns True if any change was made."""
        content = list(page.structured_content or [])
        if not content:
            return False
        changed = False
        for i, item in enumerate(content):
            if not isinstance(item, dict):
                continue
            if not item.get("id"):
                item["id"] = f"r{i}"
                changed = True
            self._enrich_table_region(item)
        # Always assign so table enrichment (headers, rows, markdown, etc.) is persisted
        page.structured_content = content
        return changed

    def _build_extraction_item(
        self,
        *,
        page_id: Union[UUID, str],
        page_number: int,
        bbox: list[float],
        region_type: str,
        source: str,
        confidence: float,
        raw_text: str,
        table: list[list[str]] | None = None,
        layout_label: str | None = None,
    ) -> dict[str, Any]:
        normalized = self._normalize_text(raw_text)
        item: dict[str, Any] = {
            "page_id": str(page_id),
            "page_number": page_number,
            "bbox": bbox,
            "region_type": region_type,
            "source": source,
            "confidence": float(confidence),
            "raw_text": raw_text,
            "normalized_text": normalized,
        }
        if table is not None:
            item["table"] = table
        if layout_label:
            item["layout_label"] = layout_label
        return item

    def _build_page_text_summary(self, items: list[dict[str, Any]]) -> str | None:
        if not items:
            return None
        for region in ("title_blocks", "text_blocks"):
            for item in items:
                if item.get("region_type") == region and item.get("normalized_text"):
                    return item["normalized_text"]
        for item in items:
            if item.get("normalized_text"):
                return item["normalized_text"]
        return None

    def _build_detection_text(self, items: list[dict[str, Any]], limit: int = 6000) -> str:
        parts = []
        for item in items:
            if item.get("region_type") in {"title_blocks", "text_blocks", "table_blocks", "figure_blocks"}:
                text = item.get("normalized_text") or ""
                if text:
                    parts.append(text)
        combined = "\n".join(parts).strip()
        return combined[:limit]

    def _extract_structured_content(
        self,
        *,
        page: fitz.Page,
        rendered: Image.Image,
        page_id: Union[UUID, str],
        page_number: int,
    ) -> tuple[list[dict[str, Any]], str | None, str, str, dict | None]:
        structured_items: list[dict[str, Any]] = []
        raw_structure: dict | None = None

        embedded_blocks = self._extract_embedded_text_blocks(page)
        for blk in embedded_blocks:
            raw_text = blk.get("raw_text", "")
            bbox = blk.get("bbox") or [0.0, 0.0, 0.0, 0.0]
            avg_font_size = blk.get("avg_font_size")
            region_type = self._embedded_region_type(raw_text, bbox, avg_font_size)
            structured_items.append(
                self._build_extraction_item(
                    page_id=page_id,
                    page_number=page_number,
                    bbox=bbox,
                    region_type=region_type,
                    source="embedded_text",
                    confidence=0.98,
                    raw_text=raw_text,
                )
            )

        for tbl in self._extract_embedded_table_blocks(page):
            table_rows = tbl.get("table") or []
            raw_text = "\n".join(["\t".join(row) for row in table_rows if row])
            structured_items.append(
                self._build_extraction_item(
                    page_id=page_id,
                    page_number=page_number,
                    bbox=tbl.get("bbox") or [0.0, 0.0, 0.0, 0.0],
                    region_type="table_blocks",
                    source="embedded_text",
                    confidence=0.95,
                    raw_text=raw_text,
                    table=table_rows,
                )
            )

        structure_blocks, _, raw_structure = self._run_ocr_with_structure(rendered)
        for blk in structure_blocks or []:
            block_type = blk.get("type", "paragraph")
            layout_label = blk.get("layout_label") or block_type
            region_type = self._region_type_from_layout(layout_label, block_type)
            bbox = blk.get("bbox") or [0.0, 0.0, 0.0, 0.0]
            confidence = blk.get("confidence")
            if confidence is None:
                confidence = 0.75

            raw_text = ""
            table_rows = None
            if block_type == "table":
                table_rows = blk.get("content") or []
                raw_text = "\n".join(["\t".join(row) for row in table_rows if row])
            elif block_type == "list":
                raw_text = "\n".join([str(x) for x in (blk.get("content") or [])])
            elif block_type != "figure":
                raw_text = str(blk.get("content") or "")

            structured_items.append(
                self._build_extraction_item(
                    page_id=page_id,
                    page_number=page_number,
                    bbox=bbox,
                    region_type=region_type,
                    source="paddle_structure",
                    confidence=float(confidence),
                    raw_text=raw_text,
                    table=table_rows,
                    layout_label=layout_label,
                )
            )

        if not structure_blocks:
            page_width_px, page_height_px = rendered.size
            ocr_lines = self._ocr_region_lines(rendered, [0.0, 0.0, 1.0, 1.0], page_width_px, page_height_px)
            for line in ocr_lines:
                structured_items.append(
                    self._build_extraction_item(
                        page_id=page_id,
                        page_number=page_number,
                        bbox=line.get("bbox") or [0.0, 0.0, 0.0, 0.0],
                        region_type="text_blocks",
                        source="ocr",
                        confidence=line.get("confidence", 0.5),
                        raw_text=line.get("text", ""),
                    )
                )

        structured_items = sorted(
            structured_items,
            key=lambda b: (
                b.get("bbox", [0, 0, 0, 0])[1] if b.get("bbox") else 0,
                b.get("bbox", [0, 0, 0, 0])[0] if b.get("bbox") else 0,
            ),
        )
        for i, item in enumerate(structured_items):
            item["id"] = f"r{i}"
            self._enrich_table_region(item)
        text_summary = self._build_page_text_summary(structured_items)
        detection_text = self._build_detection_text(structured_items)
        sources = {item.get("source") for item in structured_items}
        if "paddle_structure" in sources:
            extraction_source = "paddle_structure"
        elif "embedded_text" in sources:
            extraction_source = "embedded_text"
        elif "ocr" in sources:
            extraction_source = "ocr"
        else:
            extraction_source = ""
        return structured_items, text_summary, detection_text, extraction_source, raw_structure

    def create_pages_from_pdf(self, document: Document) -> list[Page]:
        """Render PDF to page images and create Page records. No text/OCR/tables extraction.
        Call this on upload so the document view can show pages. Run process_document later for extraction."""
        if not document.storage_uri:
            raise ValueError("Document has no storage_uri")
        pdf_path = self._uri_to_path(document.storage_uri)
        source = fitz.open(pdf_path)
        try:
            pages: list[Page] = []
            for page_index in range(source.page_count):
                rendered = self._render_page_png(source, page_index)
                image_uri = self._store_page_png(document.id, page_index + 1, rendered)
                page_row = Page(
                    document_id=document.id,
                    page_number=page_index + 1,
                    image_uri=image_uri,
                    page_type=None,
                    text_content=None,
                    structured_content=[],
                    tags=[],
                )
                pages.append(page_row)
                self.db.add(page_row)
            self.db.commit()
            for page_row in pages:
                self.db.refresh(page_row)
            return pages
        finally:
            source.close()

    def process_document(
        self,
        document: Document,
        *,
        pdf_bytes: bytes | None = None,
        original_filename: str | None = None,
        force: bool = False,
    ) -> list[Page]:
        """Store PDF if needed, create pages (if none), then extract text/OCR/tables. Or only run extraction on existing pages.
        When force=True, re-extracts even if all pages already have content."""
        if pdf_bytes is not None:
            filename = original_filename or document.filename
            document.storage_uri = self.store_original_pdf(document.id, filename, pdf_bytes)
            self.db.add(document)
            self.db.commit()
            self.db.refresh(document)

        if not document.storage_uri:
            raise ValueError("PDF bytes or storage URI are required for extraction")

        # Already fully extracted: skip unless force re-extraction
        if not force and document.pages and all(getattr(p, "text_content", None) for p in document.pages):
            return list(document.pages)

        # Open PDF from storage
        source = fitz.open(self._uri_to_path(document.storage_uri))

        try:
            pages: list[Page] = []
            for page_index in range(source.page_count):
                page = source.load_page(page_index)
                rendered = self._render_page_png(source, page_index)

                existing = next((p for p in document.pages if p.page_number == page_index + 1), None)

                page_id = existing.id if existing else uuid.uuid4()
                structured_content, text_summary, detection_text, extraction_source, raw_structure = (
                    self._extract_structured_content(
                        page=page,
                        rendered=rendered,
                        page_id=page_id,
                        page_number=page_index + 1,
                    )
                )
                self._crop_image_regions(
                    structured_content, rendered, document.id, page_index + 1
                )
                detected_type = self._detect_page_type(detection_text)
                ai_result = self.ai_assist.analyze_page(text_content=detection_text)
                page_type = detected_type
                if ai_result.pageClassification.confidence.score > 0.8 and detected_type == "notes":
                    page_type = ai_result.pageClassification.detectedPageType

                if existing:
                    if not existing.image_uri:
                        existing.image_uri = self._store_page_png(document.id, page_index + 1, rendered)
                    existing.text_content = text_summary
                    existing.structured_content = structured_content
                    existing.raw_structure = raw_structure
                    existing.page_type = page_type
                    existing.tags = [page_type, "ai_assist"]
                    existing.extraction_source = extraction_source
                    self.db.add(existing)
                    pages.append(existing)
                else:
                    image_uri = self._store_page_png(document.id, page_index + 1, rendered)
                    page_row = Page(
                        id=page_id,
                        document_id=document.id,
                        page_number=page_index + 1,
                        image_uri=image_uri,
                        page_type=page_type,
                        text_content=text_summary,
                        structured_content=structured_content,
                        raw_structure=raw_structure,
                        tags=[page_type, "ai_assist"],
                        extraction_source=extraction_source,
                    )
                    pages.append(page_row)
                    self.db.add(page_row)

            document.status = "processed"
            self.db.add(document)
            self.db.commit()
            for page_row in pages:
                self.db.refresh(page_row)
            return pages
        finally:
            source.close()

    def store_original_pdf(self, document_id: UUID, filename: str, pdf_bytes: bytes) -> str:
        target = self.storage_root / str(document_id) / "original"
        target.mkdir(parents=True, exist_ok=True)
        pdf_path = target / filename
        pdf_path.write_bytes(pdf_bytes)
        return self._path_to_uri(pdf_path)

    def store_pdf_only(
        self,
        document: Document,
        pdf_bytes: bytes,
        original_filename: str | None = None,
    ) -> None:
        """Store the PDF file and set document.storage_uri. Does not run extraction."""
        filename = original_filename or document.filename
        document.storage_uri = self.store_original_pdf(document.id, filename, pdf_bytes)
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)

    def extract_page(self, page: Page, force: bool = False) -> Page:
        """Run text/OCR/tables extraction for a single page. Updates the page in place.
        When force=True, re-extracts even if page already has content (e.g. after switching OCR mode)."""
        document = self.db.get(Document, page.document_id)
        if not document or not document.storage_uri:
            raise ValueError("Page document has no stored PDF")
        if page.text_content and not force:
            return page
        source = fitz.open(self._uri_to_path(document.storage_uri))
        try:
            page_index = page.page_number - 1
            if page_index < 0 or page_index >= source.page_count:
                raise ValueError("Page number out of range")
            p = source.load_page(page_index)
            rendered = self._render_page_png(source, page_index)
            if not page.image_uri:
                page.image_uri = self._store_page_png(document.id, page.page_number, rendered)
            structured_content, text_summary, detection_text, extraction_source, raw_structure = (
                self._extract_structured_content(
                    page=p,
                    rendered=rendered,
                    page_id=page.id,
                    page_number=page.page_number,
                )
            )
            self._crop_image_regions(
                structured_content, rendered, document.id, page.page_number
            )
            detected_type = self._detect_page_type(detection_text)
            ai_result = self.ai_assist.analyze_page(text_content=detection_text)
            page_type = detected_type
            if ai_result.pageClassification.confidence.score > 0.8 and detected_type == "notes":
                page_type = ai_result.pageClassification.detectedPageType
            page.text_content = text_summary
            page.structured_content = structured_content
            page.raw_structure = raw_structure
            page.page_type = page_type
            page.tags = [page_type, "ai_assist"]
            page.extraction_source = extraction_source
            self.db.add(page)
            document.status = "processed"
            self.db.add(document)
            self.db.commit()
            self.db.refresh(page)
            return page
        finally:
            source.close()

    def _render_page_png(self, pdf: fitz.Document, page_index: int) -> Image.Image:
        page = pdf.load_page(page_index)
        matrix = fitz.Matrix(300 / 72, 300 / 72)
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        return Image.frombytes("RGB", [pixmap.width, pixmap.height], pixmap.samples)

    def _store_page_png(self, document_id: UUID, page_number: int, image: Image.Image) -> str:
        target = self.storage_root / str(document_id) / "pages"
        target.mkdir(parents=True, exist_ok=True)
        page_path = target / f"page-{page_number}.png"
        image.save(page_path, format="PNG")
        return self._path_to_uri(page_path)

    def _store_figure_crop(
        self, document_id: UUID, page_number: int, index: int, image: Image.Image, bbox: list[float]
    ) -> str:
        """Crop image to normalized bbox [x1,y1,x2,y2] 0-1, save to storage, return URI."""
        w, h = image.size
        x1 = int(max(0, bbox[0] * w))
        y1 = int(max(0, bbox[1] * h))
        x2 = int(min(w, bbox[2] * w))
        y2 = int(min(h, bbox[3] * h))
        if x2 <= x1 or y2 <= y1:
            return ""
        crop = image.crop((x1, y1, x2, y2))
        target = self.storage_root / str(document_id) / "figures"
        target.mkdir(parents=True, exist_ok=True)
        fig_path = target / f"page-{page_number}-{index}.png"
        crop.save(fig_path, format="PNG")
        return self._path_to_uri(fig_path)

    def _process_figure_blocks(
        self,
        structured_content: list,
        image: Image.Image,
        document_id: UUID,
        page_number: int,
    ) -> None:
        """For each figure block, crop and store; add figureIndex to block. Mutates structured_content."""
        fig_idx = 0
        for blk in structured_content:
            if not isinstance(blk, dict) or blk.get("type") != "figure":
                continue
            bbox = blk.get("bbox")
            if not bbox or len(bbox) < 4:
                continue
            try:
                uri = self._store_figure_crop(document_id, page_number, fig_idx, image, bbox)
                if uri:
                    blk["figureIndex"] = fig_idx
                    fig_idx += 1
            except Exception:
                pass

    def _detect_page_type(self, text_content: str) -> PageType:
        haystack = text_content.lower()
        mapping: list[tuple[PageType, tuple[str, ...]]] = [
            ("floor_plan", ("floor plan", "ground floor", "first floor", "room", "kitchen")),
            ("elevation", ("elevation", "north elevation", "south elevation")),
            ("section", ("section", "detail section", "sec a-a")),
            ("site_plan", ("site plan", "boundary", "lot", "setback")),
            ("schedule", ("schedule", "door schedule", "window schedule", "legend")),
            ("notes", ("notes", "general notes", "specification")),
        ]
        for page_type, keywords in mapping:
            if any(word in haystack for word in keywords):
                return page_type
        return "notes"

    def _path_to_uri(self, path: Path) -> str:
        relative = path.relative_to(self.storage_root)
        return f"{self.storage_prefix}/{relative.as_posix()}"

    def _uri_to_path(self, uri: str | None) -> Path:
        if not uri:
            raise ValueError("Storage URI is missing")
        prefix = f"{self.storage_prefix}/"
        if uri.startswith(prefix):
            suffix = uri.removeprefix(prefix)
            return self.storage_root / suffix
        if uri.startswith("file://"):
            return Path(uri.removeprefix("file://"))
        return Path(uri)
