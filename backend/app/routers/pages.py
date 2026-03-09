from __future__ import annotations

import os
import re
from datetime import datetime
from math import sqrt
from pathlib import Path
from typing import Literal, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from PIL import Image
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Document, Page
from app.services.extraction_service import ExtractionService
from app.schemas.extraction_schemas import StructuredExtractionResponse
from app.schemas.overlay_schemas import NormalizedPoint
from app.schemas.quantity_schemas import PageScale

router = APIRouter(tags=["pages"])


def _image_uri_to_path(image_uri: Optional[str]) -> Path:
    """Resolve storage image_uri to filesystem path."""
    if not image_uri:
        raise HTTPException(status_code=404, detail="Page has no image")
    storage_root = Path(os.getenv("OBJECT_STORAGE_DIR", "/tmp/qsme-object-storage"))
    storage_prefix = os.getenv("OBJECT_STORAGE_PREFIX", "object://qsme")
    if image_uri.startswith(f"{storage_prefix}/"):
        rel = image_uri.removeprefix(f"{storage_prefix}/")
        path = storage_root / rel
    elif image_uri.startswith("file://"):
        path = Path(image_uri.removeprefix("file://"))
    else:
        path = Path(image_uri)
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Page image file not found at {path}. Re-upload the PDF and run extraction to generate page images.",
        )
    return path


class PageResponse(BaseModel):
    id: UUID
    pageNumber: int
    imageUrl: Optional[str] = None
    detectedPageType: Optional[str] = None
    textContent: Optional[str] = None
    structuredContent: list = []
    createdAt: datetime


class PageScaleRequest(BaseModel):
    method: Literal["title_block", "calibration"]
    point1: Optional[NormalizedPoint] = None
    point2: Optional[NormalizedPoint] = None
    real_length_m: Optional[float] = None
    declared_scale_text: Optional[str] = None


@router.get("/documents/{document_id}/pages", response_model=list[PageResponse])
def list_pages(document_id: UUID, db: Session = Depends(get_db)) -> list[PageResponse]:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    return [
        PageResponse(
            id=page.id,
            pageNumber=page.page_number,
            imageUrl=page.image_uri,
            detectedPageType=page.page_type,
            textContent=page.text_content,
            structuredContent=page.structured_content or [],
            createdAt=page.created_at,
        )
        for page in sorted(document.pages, key=lambda p: p.page_number)
    ]


@router.get("/pages/{page_id}/image", response_class=FileResponse)
def get_page_image(page_id: UUID, db: Session = Depends(get_db)) -> FileResponse:
    """Serve the rendered PNG for a page (for viewer/thumbnails)."""
    page = db.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    path = _image_uri_to_path(page.image_uri)
    return FileResponse(path, media_type="image/png")


def _figure_uri_to_path(document_id: UUID, page_number: int, figure_index: int) -> Path:
    """Resolve figure crop path from storage."""
    storage_root = Path(os.getenv("OBJECT_STORAGE_DIR", "/tmp/qsme-object-storage"))
    path = storage_root / str(document_id) / "figures" / f"page-{page_number}-{figure_index}.png"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Figure not found")
    return path


@router.get("/pages/{page_id}/figures/{figure_index}", response_class=FileResponse)
def get_page_figure(page_id: UUID, figure_index: int, db: Session = Depends(get_db)) -> FileResponse:
    """Serve a cropped figure image from PP-StructureV3 extraction."""
    page = db.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    document = db.get(Document, page.document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    path = _figure_uri_to_path(document.id, page.page_number, figure_index)
    return FileResponse(path, media_type="image/png")


class StructureJsonResponse(BaseModel):
    pageId: UUID
    rawStructure: Optional[Union[dict, list]]


@router.get("/pages/{page_id}/structure-json", response_model=StructureJsonResponse)
def get_page_structure_json(page_id: UUID, db: Session = Depends(get_db)) -> StructureJsonResponse:
    """Return raw PP-StructureV3 output for the JSON tab. 404 if not available."""
    page = db.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    raw = getattr(page, "raw_structure", None)
    if raw is None:
        return StructureJsonResponse(pageId=page.id, rawStructure=page.structured_content or [])
    return StructureJsonResponse(pageId=page.id, rawStructure=raw)


@router.get("/pages/{page_id}/structured-extraction", response_model=StructuredExtractionResponse)
def get_page_structured_extraction(page_id: UUID, db: Session = Depends(get_db)) -> StructuredExtractionResponse:
    """Return structured extraction regions for the page (id, bbox, table shape, image_url)."""
    page = db.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    regions = [item for item in (page.structured_content or []) if isinstance(item, dict)]
    return StructuredExtractionResponse(pageId=page.id, pageNumber=page.page_number, regions=regions)


class ExtractPageResponse(BaseModel):
    pageId: UUID
    status: str = "processed"


@router.post("/pages/{page_id}/extract", response_model=ExtractPageResponse)
def extract_page(
    page_id: UUID,
    force: bool = Query(False, description="Re-extract even if page already has content"),
    db: Session = Depends(get_db),
) -> ExtractPageResponse:
    """Run text/OCR/tables extraction for this page only. Returns quickly (single page)."""
    page = db.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    ExtractionService(db).extract_page(page, force=force)
    return ExtractPageResponse(pageId=page.id, status="processed")


@router.post("/pages/{page_id}/scale", response_model=PageScale)
def set_page_scale(page_id: UUID, payload: PageScaleRequest, db: Session = Depends(get_db)) -> PageScale:
    page = db.get(Page, page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")

    if payload.method == "calibration":
        if payload.point1 is None or payload.point2 is None or payload.real_length_m is None:
            raise HTTPException(status_code=400, detail="point1, point2, and real_length_m are required")

        dx = payload.point2.x - payload.point1.x
        dy = payload.point2.y - payload.point1.y
        norm_distance = sqrt(dx * dx + dy * dy)
        if norm_distance <= 0:
            raise HTTPException(status_code=400, detail="Calibration points must be distinct")

        meters_per_norm = payload.real_length_m / norm_distance
        page_scale = PageScale(
            method="calibration",
            metersPerNormX=meters_per_norm,
            metersPerNormY=meters_per_norm,
            calibrationLine=(payload.point1, payload.point2),
            calibrationRealLengthM=payload.real_length_m,
            confidence={"score": 1.0, "reason": "user calibration line"},
        )
    else:
        declared = payload.declared_scale_text or _detect_declared_scale(page.text_content or "")
        if not declared:
            raise HTTPException(status_code=400, detail="No title block scale text detected")

        ratio = _parse_scale_ratio(declared)
        if ratio is None:
            raise HTTPException(status_code=400, detail="Invalid title block scale format")

        path = _image_uri_to_path(page.image_uri)
        with Image.open(path) as img:
            width_px, height_px = img.size
        # rendered at 300 DPI => convert normalized page width/height to paper meters, then apply scale ratio
        meters_per_norm_x = (width_px / 300.0) * 0.0254 * ratio
        meters_per_norm_y = (height_px / 300.0) * 0.0254 * ratio

        page_scale = PageScale(
            method="title_block",
            metersPerNormX=meters_per_norm_x,
            metersPerNormY=meters_per_norm_y,
            declaredScaleText=declared,
            confidence={"score": 0.8, "reason": "title block scale parsed from sheet"},
        )

    page.page_scale = page_scale.model_dump(mode="json")
    db.add(page)
    db.commit()
    db.refresh(page)
    return PageScale.model_validate(page.page_scale)


def _detect_declared_scale(text: str) -> Optional[str]:
    match = re.search(r"(?:scale\s*)?(1\s*:\s*\d+)", text, re.IGNORECASE)
    if not match:
        return None
    return match.group(1).replace(" ", "")


def _parse_scale_ratio(scale_text: str) -> Optional[int]:
    match = re.search(r"1\s*:\s*(\d+)", scale_text)
    if not match:
        return None
    return int(match.group(1))


def _resolve_page_dimensions(image_uri: Optional[str]) -> tuple[int, int]:
    path = _image_uri_to_path(image_uri)
    with Image.open(path) as img:
        return img.size
