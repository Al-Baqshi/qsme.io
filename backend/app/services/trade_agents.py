from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.database_models import Overlay
from app.schemas.overlay_schemas import OpeningOverlay, OverlayKind, RoomOverlay, SymbolOverlay
from app.schemas.quantity_schemas import ProjectQuantitiesResponse, QuantityScheduleRow, Trade


@dataclass
class ProjectKnowledgeHub:
    project_id: UUID
    rooms: list[RoomOverlay]
    openings: list[OpeningOverlay]
    symbols: list[SymbolOverlay]
    base_quantities: ProjectQuantitiesResponse


class TradeAgent(Protocol):
    trade: Trade

    def run(self, hub: ProjectKnowledgeHub) -> list[QuantityScheduleRow]:
        ...


class FinishesAgent:
    trade = Trade.finishes

    def run(self, hub: ProjectKnowledgeHub) -> list[QuantityScheduleRow]:
        rows: list[QuantityScheduleRow] = []
        total = 0.0
        for room in hub.base_quantities.rooms:
            area = room.floorAreaGross.value if room.floorAreaGross else 0.0
            total += area
            rows.append(
                QuantityScheduleRow(
                    trade=self.trade,
                    item="Floor Finish Area",
                    key="finishes_floor_area_m2",
                    value=area,
                    unit="m2",
                    level=room.level,
                    unitRef=room.unitRef,
                    roomName=room.roomName,
                    overlayIds=[room.roomId],
                    confidence={"score": 0.95, "reason": "derived from room floor area"},
                )
            )

        rows.append(
            QuantityScheduleRow(
                trade=self.trade,
                item="Floor Finish Area Total",
                key="finishes_floor_area_total_m2",
                value=total,
                unit="m2",
                overlayIds=[room.roomId for room in hub.base_quantities.rooms],
                confidence={"score": 1.0, "reason": "deterministic sum"},
            )
        )
        return rows


class SkirtingAgent:
    trade = Trade.skirting

    def run(self, hub: ProjectKnowledgeHub) -> list[QuantityScheduleRow]:
        rows: list[QuantityScheduleRow] = []
        total = 0.0
        for room in hub.base_quantities.rooms:
            skirting = room.skirtingLength.value if room.skirtingLength else 0.0
            total += skirting
            opening_ids = [o.id for o in hub.openings if o.roomId == room.roomId]
            rows.append(
                QuantityScheduleRow(
                    trade=self.trade,
                    item="Skirting Length",
                    key="skirting_length_trade_m",
                    value=skirting,
                    unit="m",
                    level=room.level,
                    unitRef=room.unitRef,
                    roomName=room.roomName,
                    overlayIds=[room.roomId, *opening_ids],
                    confidence={"score": 0.95, "reason": "room perimeter less door widths"},
                )
            )

        rows.append(
            QuantityScheduleRow(
                trade=self.trade,
                item="Skirting Length Total",
                key="skirting_length_trade_total_m",
                value=total,
                unit="m",
                overlayIds=[room.roomId for room in hub.base_quantities.rooms],
                confidence={"score": 1.0, "reason": "deterministic sum"},
            )
        )
        return rows


class ElectricalAgent:
    trade = Trade.electrical

    def run(self, hub: ProjectKnowledgeHub) -> list[QuantityScheduleRow]:
        rows: list[QuantityScheduleRow] = []
        per_room: dict[UUID, int] = defaultdict(int)

        for symbol in hub.symbols:
            if symbol.symbolType not in {"socket", "switch", "light"}:
                continue
            if symbol.roomId:
                per_room[symbol.roomId] += 1

        total = 0
        for room in hub.rooms:
            count = per_room.get(room.id, 0)
            total += count
            rows.append(
                QuantityScheduleRow(
                    trade=self.trade,
                    item="Electrical Points",
                    key="electrical_points_count",
                    value=float(count),
                    unit="count",
                    level=room.level,
                    unitRef=room.unitRef,
                    roomName=room.name,
                    overlayIds=[room.id, *[s.id for s in hub.symbols if s.roomId == room.id]],
                    confidence={"score": 0.9, "reason": "count of socket/switch/light symbols"},
                )
            )

        rows.append(
            QuantityScheduleRow(
                trade=self.trade,
                item="Electrical Points Total",
                key="electrical_points_total_count",
                value=float(total),
                unit="count",
                overlayIds=[s.id for s in hub.symbols if s.symbolType in {"socket", "switch", "light"}],
                confidence={"score": 1.0, "reason": "deterministic sum"},
            )
        )
        return rows


class PlumbingAgent:
    trade = Trade.plumbing

    def run(self, hub: ProjectKnowledgeHub) -> list[QuantityScheduleRow]:
        rows: list[QuantityScheduleRow] = []
        total = 0
        for room in hub.rooms:
            room_symbols = [s for s in hub.symbols if s.roomId == room.id and s.symbolType == "plumbing_point"]
            count = len(room_symbols)
            total += count
            rows.append(
                QuantityScheduleRow(
                    trade=self.trade,
                    item="Plumbing Points",
                    key="plumbing_points_count",
                    value=float(count),
                    unit="count",
                    level=room.level,
                    unitRef=room.unitRef,
                    roomName=room.name,
                    overlayIds=[room.id, *[s.id for s in room_symbols]],
                    confidence={"score": 0.9, "reason": "count of plumbing_point symbols"},
                )
            )

        rows.append(
            QuantityScheduleRow(
                trade=self.trade,
                item="Plumbing Points Total",
                key="plumbing_points_total_count",
                value=float(total),
                unit="count",
                overlayIds=[s.id for s in hub.symbols if s.symbolType == "plumbing_point"],
                confidence={"score": 1.0, "reason": "deterministic sum"},
            )
        )
        return rows


class ConcreteAgent:
    trade = Trade.concrete

    def run(self, hub: ProjectKnowledgeHub) -> list[QuantityScheduleRow]:
        rows: list[QuantityScheduleRow] = []
        total_area = 0.0
        for room in hub.base_quantities.rooms:
            area = room.floorAreaGross.value if room.floorAreaGross else 0.0
            room_type = next((r.roomType for r in hub.rooms if r.id == room.roomId), "other")
            if room_type not in {"garage", "storage", "other"}:
                continue
            total_area += area
            rows.append(
                QuantityScheduleRow(
                    trade=self.trade,
                    item="Concrete Slab Area",
                    key="concrete_slab_area_m2",
                    value=area,
                    unit="m2",
                    level=room.level,
                    unitRef=room.unitRef,
                    roomName=room.roomName,
                    overlayIds=[room.roomId],
                    confidence={"score": 0.75, "reason": "room-type heuristic (garage/storage/other)"},
                )
            )

        rows.append(
            QuantityScheduleRow(
                trade=self.trade,
                item="Concrete Slab Area Total",
                key="concrete_slab_area_total_m2",
                value=total_area,
                unit="m2",
                overlayIds=[row.overlayIds[0] for row in rows if row.overlayIds],
                confidence={"score": 0.85, "reason": "deterministic sum with heuristic room filter"},
            )
        )
        return rows


class BossAgent:
    """Orchestrates all trade agents and returns a merged project quantities response."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.agents: list[TradeAgent] = [
            FinishesAgent(),
            SkirtingAgent(),
            ElectricalAgent(),
            PlumbingAgent(),
            ConcreteAgent(),
        ]

    def run(self, hub: ProjectKnowledgeHub) -> ProjectQuantitiesResponse:
        trade_rows: list[QuantityScheduleRow] = []
        for agent in self.agents:
            trade_rows.extend(agent.run(hub))

        merged = hub.base_quantities.model_copy(deep=True)
        merged.scheduleRows = [*merged.scheduleRows, *trade_rows]
        merged.issues = [*merged.issues, "trade_agents_completed"]
        return merged


def build_project_knowledge_hub(
    project_id: UUID,
    overlays: list[Overlay],
    base_quantities: ProjectQuantitiesResponse,
) -> ProjectKnowledgeHub:
    rooms: list[RoomOverlay] = []
    openings: list[OpeningOverlay] = []
    symbols: list[SymbolOverlay] = []

    for o in overlays:
        payload = {
            "id": o.id,
            "projectId": o.project_id,
            "documentId": o.document_id,
            "pageId": o.page_id,
            "kind": o.kind,
            "source": o.source,
            "createdAt": o.created_at,
            "updatedAt": o.updated_at,
            "locked": o.locked,
            "hidden": o.hidden,
            "verified": o.verified,
            "confidence": o.confidence,
            "evidence": o.evidence,
            "tags": o.tags,
            "meta": o.meta,
            **(o.payload or {}),
        }
        if o.kind == OverlayKind.room.value:
            rooms.append(RoomOverlay.model_validate(payload))
        elif o.kind == OverlayKind.opening.value:
            openings.append(OpeningOverlay.model_validate(payload))
        elif o.kind == OverlayKind.symbol.value:
            symbols.append(SymbolOverlay.model_validate(payload))

    return ProjectKnowledgeHub(
        project_id=project_id,
        rooms=rooms,
        openings=openings,
        symbols=symbols,
        base_quantities=base_quantities,
    )
