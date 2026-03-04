from __future__ import annotations

import os
from pathlib import Path
from typing import Literal
from uuid import UUID

import fitz
import pytesseract
from PIL import Image
from sqlalchemy.orm import Session

from app.models.database_models import Document, Page
from app.services.ai_assist_service import AIAssistService

PageType = Literal["floor_plan", "elevation", "section", "site_plan", "notes", "schedule"]


class ExtractionService:
    """PDF extraction pipeline: store, split, render, text extract/OCR, classify pages."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.storage_root = Path(os.getenv("OBJECT_STORAGE_DIR", "/tmp/qsme-object-storage"))
        self.storage_prefix = os.getenv("OBJECT_STORAGE_PREFIX", "object://qsme")
        self.storage_root.mkdir(parents=True, exist_ok=True)
        self.ai_assist = AIAssistService()

    def process_document(
        self,
        document: Document,
        *,
        pdf_bytes: bytes | None = None,
        original_filename: str | None = None,
    ) -> list[Page]:
        if document.pages:
            return document.pages

        if pdf_bytes is None and not document.storage_uri:
            raise ValueError("PDF bytes or storage URI are required for extraction")

        if pdf_bytes is not None:
            filename = original_filename or document.filename
            document.storage_uri = self.store_original_pdf(document.id, filename, pdf_bytes)
            source = fitz.open(stream=pdf_bytes, filetype="pdf")
        else:
            pdf_path = self._uri_to_path(document.storage_uri)
            source = fitz.open(pdf_path)

        try:
            pages: list[Page] = []
            for page_index in range(source.page_count):
                page = source.load_page(page_index)
                rendered = self._render_page_png(source, page_index)
                image_uri = self._store_page_png(document.id, page_index + 1, rendered)

                extracted_text = (page.get_text("text") or "").strip()
                if not extracted_text:
                    extracted_text = (pytesseract.image_to_string(rendered) or "").strip()

                detected_type = self._detect_page_type(extracted_text)
                ai_result = self.ai_assist.analyze_page(text_content=extracted_text)
                page_type = detected_type
                if ai_result.pageClassification.confidence.score > 0.8 and detected_type == "notes":
                    page_type = ai_result.pageClassification.detectedPageType

                page_row = Page(
                    document_id=document.id,
                    page_number=page_index + 1,
                    image_uri=image_uri,
                    page_type=page_type,
                    text_content=extracted_text,
                    tags=[page_type, "ai_assist"],
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
