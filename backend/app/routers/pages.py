from __future__ import annotations

import os
import re
from datetime import datetime
from math import sqrt
from pathlib import Path
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from PIL import Image
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Document, Page
from app.schemas.overlay_schemas import NormalizedPoint
from app.schemas.quantity_schemas import PageScale

router = APIRouter(tags=["pages"])


class PageResponse(BaseModel):
    id: UUID
    pageNumber: int
    imageUrl: str | None
    detectedPageType: str | None
    textContent: str | None
    createdAt: datetime


class PageScaleRequest(BaseModel):
    method: Literal["title_block", "calibration"]
    point1: NormalizedPoint | None = None
    point2: NormalizedPoint | None = None
    real_length_m: float | None = None
    declared_scale_text: str | None = None


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
            createdAt=page.created_at,
        )
        for page in sorted(document.pages, key=lambda p: p.page_number)
    ]


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

        width_px, height_px = _resolve_page_dimensions(page.image_uri)
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


def _detect_declared_scale(text: str) -> str | None:
    match = re.search(r"(?:scale\s*)?(1\s*:\s*\d+)", text, re.IGNORECASE)
    if not match:
        return None
    return match.group(1).replace(" ", "")


def _parse_scale_ratio(scale_text: str) -> int | None:
    match = re.search(r"1\s*:\s*(\d+)", scale_text)
    if not match:
        return None
    return int(match.group(1))


def _resolve_page_dimensions(image_uri: str | None) -> tuple[int, int]:
    if not image_uri:
        raise HTTPException(status_code=400, detail="Page image is required for title block scale calibration")

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
        raise HTTPException(status_code=400, detail="Page image file not found for title block scale")

    with Image.open(path) as img:
        return img.size
