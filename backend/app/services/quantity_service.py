from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from app.models.database_models import Overlay, Page, QuantitySnapshot
from app.schemas.overlay_schemas import (
    MeasurementOverlay,
    OpeningOverlay,
    OverlayKind,
    RoomOverlay,
)
from app.schemas.quantity_schemas import (
    PageScale,
    ProjectQuantitiesResponse,
    QuantityEngineInput,
    QuantityRulesProfile,
)
from app.application.quantity_engine import QuantityEngine
from app.services.project_knowledge_hub import ProjectKnowledgeHubService
from app.services.export_engine import ExportEngine
from app.services.trade_agents import BossAgent, build_project_knowledge_hub

ROOM_ADAPTER = TypeAdapter(RoomOverlay)
OPENING_ADAPTER = TypeAdapter(OpeningOverlay)
MEASUREMENT_ADAPTER = TypeAdapter(MeasurementOverlay)
PROJECT_QUANTITIES_ADAPTER = TypeAdapter(ProjectQuantitiesResponse)


class QuantityService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.engine = QuantityEngine()
        self.boss_agent = BossAgent(db)
        self.hub_service = ProjectKnowledgeHubService(db)
        self.export_engine = ExportEngine(db)

    def get_project_quantities(self, project_id: UUID) -> ProjectQuantitiesResponse:
        context = self.hub_service.get_project_context(project_id)
        if context.quantities and not context.needsRecompute:
            return PROJECT_QUANTITIES_ADAPTER.validate_python(context.quantities)

        overlays = self.db.query(Overlay).filter(Overlay.project_id == project_id).all()

        rooms: list[RoomOverlay] = []
        openings: list[OpeningOverlay] = []
        measurements: list[MeasurementOverlay] = []

        for overlay in overlays:
            raw = self._db_overlay_to_payload(overlay)
            if overlay.kind == OverlayKind.room.value:
                rooms.append(ROOM_ADAPTER.validate_python(raw))
            elif overlay.kind == OverlayKind.opening.value:
                openings.append(OPENING_ADAPTER.validate_python(raw))
            elif overlay.kind == OverlayKind.measurement.value:
                measurements.append(MEASUREMENT_ADAPTER.validate_python(raw))

        scales_by_page = self._build_scales_by_page(measurements)
        for page in self.db.query(Page).filter(Page.document_id.in_({o.document_id for o in overlays})).all() if overlays else []:
            if page.page_scale:
                scales_by_page[page.id] = PageScale.model_validate(page.page_scale)

        engine_input = QuantityEngineInput(
            projectId=project_id,
            rules=QuantityRulesProfile(profileName="NZ Residential v1"),
            scalesByPage=scales_by_page,
            overlayIds=[overlay.id for overlay in overlays],
        )

        base_response = self.engine.compute(engine_input, rooms, openings, measurements)
        hub = build_project_knowledge_hub(project_id, overlays, base_response)
        response = self.boss_agent.run(hub)
        response.version = max(response.version, context.contextVersion)

        snapshot = QuantitySnapshot(
            project_id=project_id,
            version=response.version,
            payload=response.model_dump(mode="json"),
            created_at=datetime.utcnow(),
        )
        self.db.add(snapshot)
        self.db.commit()
        return response

    def queue_export(self, project_id: UUID, export_format: str) -> dict:
        quantities = self.get_project_quantities(project_id)
        return self.export_engine.export(project_id, quantities, export_format)

    def _db_overlay_to_payload(self, overlay: Overlay) -> dict:
        return {
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
            "meta": overlay.meta,
            **(overlay.payload or {}),
        }

    def _build_scales_by_page(self, measurements: list[MeasurementOverlay]) -> dict[UUID, PageScale]:
        scales: dict[UUID, PageScale] = {}
        for measurement in measurements:
            if not measurement.valueM or measurement.valueM <= 0:
                continue
            dx = measurement.end.x - measurement.start.x
            dy = measurement.end.y - measurement.start.y
            norm = (dx * dx + dy * dy) ** 0.5
            if norm <= 0:
                continue
            meters_per_norm = measurement.valueM / norm
            scales[measurement.pageId] = PageScale(
                method="calibration",
                metersPerNormX=meters_per_norm,
                metersPerNormY=meters_per_norm,
                calibrationLine=(measurement.start, measurement.end),
                calibrationRealLengthM=measurement.valueM,
                confidence={"score": 0.9, "reason": "derived from measurement overlay"},
            )
        return scales
