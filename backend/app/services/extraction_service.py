from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Literal
from uuid import UUID

import fitz
import pytesseract
from PIL import Image
from sqlalchemy.orm import Session

from app.models.database_models import Document, Page
from app.services.ai_assist_service import AIAssistService
from app.services.structured_extraction import (
    merge_pdf_tables_with_blocks,
    structured_blocks_from_paddle_basic,
    structured_blocks_from_paddle_structure,
    structured_blocks_from_pdf_dict,
    structured_blocks_from_plain_text,
)

PageType = Literal["floor_plan", "elevation", "section", "site_plan", "notes", "schedule"]


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

                extracted_text = (page.get_text("text") or "").strip()
                use_paddle = os.getenv("USE_PADDLE_OCR", "false").strip().lower() == "true"
                ocr_mode = os.getenv("PADDLE_OCR_MODE", "basic").strip().lower()

                structured_content: list = []
                ocr_text = ""
                extraction_source: str | None = None
                raw_structure: dict | None = None

                if use_paddle and ocr_mode == "structure":
                    try:
                        structure_blocks, ocr_text, raw_structure = self._run_ocr_with_structure(rendered)
                        if structure_blocks or ocr_text:
                            structured_content = structure_blocks
                            extraction_source = "pp_structure_v3"
                            self._process_figure_blocks(
                                structured_content, rendered, document.id, page_index + 1
                            )
                            if ocr_text:
                                if len(extracted_text) < 250:
                                    extracted_text = ocr_text
                                else:
                                    extracted_text = extracted_text + "\n\n" + ocr_text
                    except Exception:
                        pass

                if not structured_content:
                    if use_paddle and ocr_mode == "basic":
                        try:
                            paddle_blocks, ocr_text = self._run_ocr_with_paddle_basic(rendered)
                            if paddle_blocks or ocr_text:
                                structured_content = paddle_blocks
                                extraction_source = "paddle_basic"
                                if ocr_text:
                                    if len(extracted_text) < 250:
                                        extracted_text = ocr_text
                                    else:
                                        extracted_text = extracted_text + "\n\n" + ocr_text
                        except Exception:
                            pass
                    if not structured_content:
                        ocr_text = self._run_ocr(rendered)
                        if ocr_text:
                            if len(extracted_text) < 250:
                                extracted_text = ocr_text
                            else:
                                extracted_text = extracted_text + "\n\n" + ocr_text
                        try:
                            d = page.get_text("dict")
                            if d and d.get("blocks"):
                                page_height = getattr(page.rect, "height", None) or 0
                                blocks_from_dict = structured_blocks_from_pdf_dict(d, page_height=page_height)
                            else:
                                blocks_from_dict = structured_blocks_from_plain_text(extracted_text)
                        except Exception:
                            blocks_from_dict = structured_blocks_from_plain_text(extracted_text)
                        pdf_tables: list[list[list[str]]] = []
                        try:
                            finder = page.find_tables()
                            if getattr(finder, "tables", None):
                                for t in finder.tables:
                                    rows = t.extract()
                                    if rows:
                                        pdf_tables.append([[str(c) if c is not None else "" for c in row] for row in rows])
                        except Exception:
                            pass
                        structured_content = merge_pdf_tables_with_blocks(pdf_tables, blocks_from_dict)
                        extraction_source = "tesseract" if not use_paddle else "pdf_text"

                detected_type = self._detect_page_type(extracted_text)
                ai_result = self.ai_assist.analyze_page(text_content=extracted_text)
                page_type = detected_type
                if ai_result.pageClassification.confidence.score > 0.8 and detected_type == "notes":
                    page_type = ai_result.pageClassification.detectedPageType

                if existing:
                    if not existing.image_uri:
                        existing.image_uri = self._store_page_png(document.id, page_index + 1, rendered)
                    existing.text_content = extracted_text
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
                        document_id=document.id,
                        page_number=page_index + 1,
                        image_uri=image_uri,
                        page_type=page_type,
                        text_content=extracted_text,
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
            extracted_text = (p.get_text("text") or "").strip()
            use_paddle = os.getenv("USE_PADDLE_OCR", "false").strip().lower() == "true"
            ocr_mode = os.getenv("PADDLE_OCR_MODE", "basic").strip().lower()

            structured_content = []
            ocr_text = ""
            extraction_source: str | None = None
            raw_structure: dict | None = None
            if use_paddle and ocr_mode == "structure":
                try:
                    structure_blocks, ocr_text, raw_structure = self._run_ocr_with_structure(rendered)
                    if structure_blocks or ocr_text:
                        structured_content = structure_blocks
                        extraction_source = "pp_structure_v3"
                        self._process_figure_blocks(
                            structured_content, rendered, document.id, page.page_number
                        )
                        if ocr_text:
                            if len(extracted_text) < 250:
                                extracted_text = ocr_text
                            else:
                                extracted_text = extracted_text + "\n\n" + ocr_text
                except Exception:
                    pass

            if not structured_content:
                if use_paddle and ocr_mode == "basic":
                    try:
                        paddle_blocks, ocr_text = self._run_ocr_with_paddle_basic(rendered)
                        if paddle_blocks or ocr_text:
                            structured_content = paddle_blocks
                            extraction_source = "paddle_basic"
                            if ocr_text:
                                if len(extracted_text) < 250:
                                    extracted_text = ocr_text
                                else:
                                    extracted_text = extracted_text + "\n\n" + ocr_text
                    except Exception:
                        pass
                if not structured_content:
                    ocr_text = self._run_ocr(rendered)
                    if ocr_text:
                        if len(extracted_text) < 250:
                            extracted_text = ocr_text
                        else:
                            extracted_text = extracted_text + "\n\n" + ocr_text
                    try:
                        d = p.get_text("dict")
                        if d and d.get("blocks"):
                            page_height = getattr(p.rect, "height", None) or 0
                            blocks_from_dict = structured_blocks_from_pdf_dict(d, page_height=page_height)
                        else:
                            blocks_from_dict = structured_blocks_from_plain_text(extracted_text)
                    except Exception:
                        blocks_from_dict = structured_blocks_from_plain_text(extracted_text)
                    pdf_tables = []
                    try:
                        finder = p.find_tables()
                        if getattr(finder, "tables", None):
                            for t in finder.tables:
                                rows = t.extract()
                                if rows:
                                    pdf_tables.append([[str(c) if c is not None else "" for c in row] for row in rows])
                    except Exception:
                        pass
                    structured_content = merge_pdf_tables_with_blocks(pdf_tables, blocks_from_dict)
                    extraction_source = "tesseract" if not use_paddle else "pdf_text"
            detected_type = self._detect_page_type(extracted_text)
            ai_result = self.ai_assist.analyze_page(text_content=extracted_text)
            page_type = detected_type
            if ai_result.pageClassification.confidence.score > 0.8 and detected_type == "notes":
                page_type = ai_result.pageClassification.detectedPageType
            page.text_content = extracted_text
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
