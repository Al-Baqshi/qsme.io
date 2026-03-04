from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.database_models import (
    Measurement,
    Note,
    Opening,
    Overlay,
    OverlayRevision,
    Page,
    Room,
    Symbol,
)
from app.schemas.overlay_schemas import OverlayCreate, OverlayPatch

OVERLAY_GEOMETRY_FIELDS = {
    "room": {"polygon", "holes"},
    "opening": {"bbox"},
    "symbol": {"position"},
    "measurement": {"start", "end"},
    "note": {"position"},
}

OVERLAY_METADATA_FIELDS = {
    "room": {"name", "roomType", "level", "unitRef", "cachedAreaM2", "cachedPerimeterM"},
    "opening": {"openingType", "widthM", "heightM", "roomId", "wallId"},
    "symbol": {"symbolType", "rotationDeg", "sizeNorm", "roomId", "label"},
    "measurement": {"method", "valueM", "displayUnits", "label", "roomId"},
    "note": {"text", "category"},
}

TYPE_TABLE = {
    "room": Room,
    "opening": Opening,
    "symbol": Symbol,
    "measurement": Measurement,
    "note": Note,
}


class OverlayService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_overlay(self, page_id: UUID, payload: OverlayCreate) -> Overlay:
        page = self.db.get(Page, page_id)
        if page is None:
            raise HTTPException(status_code=404, detail="Page not found")

        data = payload.model_dump()
        kind = data["kind"]

        overlay = Overlay(
            project_id=data["projectId"],
            document_id=data["documentId"],
            page_id=data["pageId"],
            kind=kind,
            source=data["source"],
            verified=data["verified"],
            hidden=data["hidden"],
            tags=data["tags"],
            meta=data["meta"],
            confidence={"score": 1.0},
            evidence=[],
            payload={},
            version=1,
        )
        self.db.add(overlay)
        self.db.flush()

        geometry, metadata = self._split_geometry_metadata(kind, data)
        self._upsert_typed_overlay(overlay, geometry, metadata)
        overlay.payload = {**geometry, **metadata}

        self._add_revision(overlay)

        self.db.commit()
        self.db.refresh(overlay)
        return overlay

    def update_overlay(self, overlay_id: UUID, patch: OverlayPatch) -> Overlay:
        overlay = self.db.get(Overlay, overlay_id)
        if overlay is None:
            raise HTTPException(status_code=404, detail="Overlay not found")

        updates = patch.model_dump(exclude_none=True)
        for field in ("verified", "hidden", "locked", "tags", "meta"):
            if field in updates:
                setattr(overlay, field, updates.pop(field))

        typed_row = self._get_typed_row(overlay)
        geometry = dict((typed_row.geometry if typed_row else {}) or {})
        metadata = dict((typed_row.metadata if typed_row else {}) or {})

        for key, value in updates.items():
            if key in OVERLAY_GEOMETRY_FIELDS[overlay.kind]:
                geometry[key] = value
            elif key in OVERLAY_METADATA_FIELDS[overlay.kind]:
                metadata[key] = value

        self._upsert_typed_overlay(overlay, geometry, metadata)

        overlay.payload = {**geometry, **metadata}
        overlay.version += 1
        overlay.updated_at = datetime.utcnow()

        self._add_revision(overlay)

        self.db.add(overlay)
        self.db.commit()
        self.db.refresh(overlay)
        return overlay

    def delete_overlay(self, overlay_id: UUID) -> None:
        overlay = self.db.get(Overlay, overlay_id)
        if overlay is None:
            raise HTTPException(status_code=404, detail="Overlay not found")
        self.db.delete(overlay)
        self.db.commit()

    def get_page_overlays(self, page_id: UUID) -> list[Overlay]:
        page = self.db.get(Page, page_id)
        if page is None:
            raise HTTPException(status_code=404, detail="Page not found")
        return (
            self.db.query(Overlay)
            .filter(Overlay.page_id == page_id)
            .order_by(Overlay.updated_at.asc())
            .all()
        )

    def _split_geometry_metadata(self, kind: str, data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        geometry = {k: v for k, v in data.items() if k in OVERLAY_GEOMETRY_FIELDS[kind] and v is not None}
        metadata = {k: v for k, v in data.items() if k in OVERLAY_METADATA_FIELDS[kind] and v is not None}
        return geometry, metadata

    def _get_typed_row(self, overlay: Overlay) -> Room | Opening | Symbol | Measurement | Note | None:
        if overlay.kind == "room":
            return overlay.room
        if overlay.kind == "opening":
            return overlay.opening
        if overlay.kind == "symbol":
            return overlay.symbol
        if overlay.kind == "measurement":
            return overlay.measurement
        if overlay.kind == "note":
            return overlay.note
        return None

    def _upsert_typed_overlay(self, overlay: Overlay, geometry: dict[str, Any], metadata: dict[str, Any]) -> None:
        typed = self._get_typed_row(overlay)
        if typed is None:
            typed = TYPE_TABLE[overlay.kind](overlay_id=overlay.id, geometry=geometry, metadata=metadata)
            self.db.add(typed)
        else:
            typed.geometry = geometry
            typed.metadata = metadata
            self.db.add(typed)

    def _add_revision(self, overlay: Overlay) -> None:
        snapshot = {
            "projectId": str(overlay.project_id),
            "documentId": str(overlay.document_id),
            "pageId": str(overlay.page_id),
            "kind": overlay.kind,
            "source": overlay.source,
            "version": overlay.version,
            "geometry": {k: v for k, v in overlay.payload.items() if k in OVERLAY_GEOMETRY_FIELDS[overlay.kind]},
            "metadata": {k: v for k, v in overlay.payload.items() if k in OVERLAY_METADATA_FIELDS[overlay.kind]},
            "overlayMeta": {
                "locked": overlay.locked,
                "hidden": overlay.hidden,
                "verified": overlay.verified,
                "tags": overlay.tags,
                "meta": overlay.meta,
                "confidence": overlay.confidence,
            },
        }
        self.db.add(OverlayRevision(overlay_id=overlay.id, version=overlay.version, snapshot=snapshot))
