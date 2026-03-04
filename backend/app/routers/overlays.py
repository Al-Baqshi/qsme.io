from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Overlay as OverlayModel
from app.schemas.overlay_schemas import Overlay, OverlayCreate, OverlayPatch
from app.services.overlay_service import OverlayService

router = APIRouter(tags=["overlays"])
_overlay_adapter = TypeAdapter(Overlay)


def _serialize_overlay(overlay: OverlayModel) -> Overlay:
    shape = {
        "id": overlay.id,
        "projectId": overlay.project_id,
        "documentId": overlay.document_id,
        "pageId": overlay.page_id,
        "kind": overlay.kind,
        "source": overlay.source,
        "createdAt": overlay.created_at,
        "updatedAt": overlay.updated_at,
        "locked": overlay.locked,
        "hidden": overlay.hidden,
        "verified": overlay.verified,
        "confidence": overlay.confidence,
        "evidence": overlay.evidence,
        "tags": overlay.tags,
        "meta": {**(overlay.meta or {}), "version": overlay.version},
        **(overlay.payload or {}),
    }
    return _overlay_adapter.validate_python(shape)


@router.post("/pages/{page_id}/overlays", response_model=Overlay)
def create_overlay(page_id: UUID, payload: OverlayCreate, db: Session = Depends(get_db)) -> Overlay:
    overlay = OverlayService(db).create_overlay(page_id, payload)
    return _serialize_overlay(overlay)


@router.get("/pages/{page_id}/overlays", response_model=list[Overlay])
def get_page_overlays(page_id: UUID, db: Session = Depends(get_db)) -> list[Overlay]:
    overlays = OverlayService(db).get_page_overlays(page_id)
    return [_serialize_overlay(overlay) for overlay in overlays]


@router.patch("/overlays/{overlay_id}", response_model=Overlay)
def update_overlay(overlay_id: UUID, payload: OverlayPatch, db: Session = Depends(get_db)) -> Overlay:
    overlay = OverlayService(db).update_overlay(overlay_id, payload)
    return _serialize_overlay(overlay)


@router.delete("/overlays/{overlay_id}", status_code=204)
def delete_overlay(overlay_id: UUID, db: Session = Depends(get_db)) -> None:
    OverlayService(db).delete_overlay(overlay_id)
