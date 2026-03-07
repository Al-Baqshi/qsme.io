"""Deterministic quantity engine. Depends only on domain."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from math import sqrt
from uuid import UUID

from app.domain.entities.overlay import (
    MeasurementOverlay,
    OpeningOverlay,
    RoomOverlay,
)
from app.domain.entities.quantity import (
    ProjectQuantitiesResponse,
    QuantityEngineInput,
    QuantityScheduleRow,
    RoomQuantityBundle,
)
from app.domain.value_objects.overlay import (
    Confidence,
    MeasurementMethod,
    NormalizedPoint,
    OpeningType,
)
from app.domain.value_objects.quantity import (
    PageScale,
    QuantityValue,
    Trade,
)


class QuantityEngine:
    """Deterministic quantity engine based on room/opening/measurement overlays."""

    def compute(
        self,
        engine_input: QuantityEngineInput,
        rooms: list[RoomOverlay],
        openings: list[OpeningOverlay],
        measurements: list[MeasurementOverlay],
    ) -> ProjectQuantitiesResponse:
        issues: list[str] = []
        scales = dict(engine_input.scalesByPage)
        self._fill_missing_scales_from_measurements(scales, measurements)

        openings_by_room: dict[UUID, list[OpeningOverlay]] = defaultdict(list)
        for opening in openings:
            if opening.roomId:
                openings_by_room[opening.roomId].append(opening)

        room_bundles: list[RoomQuantityBundle] = []
        schedule_rows: list[QuantityScheduleRow] = []

        totals = {
            "floor_area_gross_m2": 0.0,
            "perimeter_m": 0.0,
            "skirting_length_m": 0.0,
            "wall_area_gross_m2": 0.0,
            "wall_area_net_m2": 0.0,
        }

        totals_by_level: dict[str, dict[str, float]] = defaultdict(
            lambda: {
                "floor_area_gross_m2": 0.0,
                "perimeter_m": 0.0,
                "skirting_length_m": 0.0,
                "wall_area_gross_m2": 0.0,
                "wall_area_net_m2": 0.0,
            }
        )

        for room in rooms:
            scale = scales.get(room.pageId)
            if scale is None or scale.metersPerNormX is None or scale.metersPerNormY is None:
                issues.append(f"Missing calibration scale for room {room.name} on page {room.pageId}")
                mx, my = 1.0, 1.0
                conf = 0.5
            else:
                mx, my = scale.metersPerNormX, scale.metersPerNormY
                conf = min(scale.confidence.score, 1.0)

            area_m2 = self._polygon_area_m2(room.polygon, mx, my)
            perimeter_m = self._polygon_perimeter_m(room.polygon, mx, my)

            room_openings = openings_by_room.get(room.id, [])
            door_width_sum = sum(
                self._opening_width_m(o, mx, my, engine_input)
                for o in room_openings
                if o.openingType == OpeningType.door
            )
            opening_area_sum = sum(
                self._opening_area_m2(o, mx, my, engine_input) for o in room_openings
            )

            skirting_m = max(0.0, perimeter_m - door_width_sum)
            wall_area_gross = perimeter_m * engine_input.rules.defaultWallHeightM
            wall_area_net = max(0.0, wall_area_gross - opening_area_sum)

            overlay_ids = [room.id, *[o.id for o in room_openings]]
            qv_area = QuantityValue(value=area_m2, unit="m2", confidence=Confidence(score=conf))
            qv_perimeter = QuantityValue(value=perimeter_m, unit="m", confidence=Confidence(score=conf))
            qv_skirting = QuantityValue(value=skirting_m, unit="m", confidence=Confidence(score=conf))
            qv_wall_gross = QuantityValue(value=wall_area_gross, unit="m2", confidence=Confidence(score=conf))
            qv_wall_net = QuantityValue(value=wall_area_net, unit="m2", confidence=Confidence(score=conf))

            room_bundle = RoomQuantityBundle(
                roomId=room.id,
                roomName=room.name,
                level=room.level,
                unitRef=room.unitRef,
                floorAreaGross=qv_area,
                perimeter=qv_perimeter,
                skirtingLength=qv_skirting,
                wallAreaGross=qv_wall_gross,
                wallAreaNet=qv_wall_net,
                extras={},
            )
            room_bundles.append(room_bundle)

            self._add_room_schedule_rows(
                schedule_rows, room, overlay_ids,
                qv_area, qv_perimeter, qv_skirting, qv_wall_gross, qv_wall_net,
            )

            totals["floor_area_gross_m2"] += area_m2
            totals["perimeter_m"] += perimeter_m
            totals["skirting_length_m"] += skirting_m
            totals["wall_area_gross_m2"] += wall_area_gross
            totals["wall_area_net_m2"] += wall_area_net

            if room.level:
                level_bucket = totals_by_level[room.level]
                level_bucket["floor_area_gross_m2"] += area_m2
                level_bucket["perimeter_m"] += perimeter_m
                level_bucket["skirting_length_m"] += skirting_m
                level_bucket["wall_area_gross_m2"] += wall_area_gross
                level_bucket["wall_area_net_m2"] += wall_area_net

        for level, level_totals in totals_by_level.items():
            self._add_total_rows(schedule_rows, level_totals, f"Level {level}", level=level)

        self._add_total_rows(schedule_rows, totals, "Project")

        return ProjectQuantitiesResponse(
            projectId=engine_input.projectId,
            generatedAt=datetime.utcnow(),
            version=1,
            rooms=room_bundles,
            scheduleRows=schedule_rows,
            issues=sorted(set(issues)),
        )

    def _fill_missing_scales_from_measurements(
        self, scales: dict[UUID, PageScale], measurements: list[MeasurementOverlay]
    ) -> None:
        for m in measurements:
            if m.method not in {MeasurementMethod.manual, MeasurementMethod.ocr, MeasurementMethod.ai}:
                continue
            if m.valueM is None or m.valueM <= 0:
                continue
            if m.pageId in scales and scales[m.pageId].metersPerNormX and scales[m.pageId].metersPerNormY:
                continue
            norm_distance = self._distance_norm(m.start, m.end)
            if norm_distance <= 0:
                continue
            meters_per_norm = m.valueM / norm_distance
            scales[m.pageId] = PageScale(
                method="calibration",
                metersPerNormX=meters_per_norm,
                metersPerNormY=meters_per_norm,
                calibrationLine=(m.start, m.end),
                calibrationRealLengthM=m.valueM,
                confidence=Confidence(score=0.8, reason="derived from measurement overlay"),
            )

    def _polygon_area_m2(
        self,
        points: list[NormalizedPoint],
        meters_per_norm_x: float,
        meters_per_norm_y: float,
    ) -> float:
        if len(points) < 3:
            return 0.0
        scaled = [(p.x * meters_per_norm_x, p.y * meters_per_norm_y) for p in points]
        area = 0.0
        for i, (x1, y1) in enumerate(scaled):
            x2, y2 = scaled[(i + 1) % len(scaled)]
            area += (x1 * y2) - (x2 * y1)
        return abs(area) * 0.5

    def _polygon_perimeter_m(
        self,
        points: list[NormalizedPoint],
        meters_per_norm_x: float,
        meters_per_norm_y: float,
    ) -> float:
        if len(points) < 2:
            return 0.0
        perimeter = 0.0
        for i, p1 in enumerate(points):
            p2 = points[(i + 1) % len(points)]
            dx = (p2.x - p1.x) * meters_per_norm_x
            dy = (p2.y - p1.y) * meters_per_norm_y
            perimeter += sqrt(dx * dx + dy * dy)
        return perimeter

    def _opening_width_m(
        self,
        opening: OpeningOverlay,
        meters_per_norm_x: float,
        meters_per_norm_y: float,
        engine_input: QuantityEngineInput,
    ) -> float:
        if opening.widthM and opening.widthM > 0:
            return opening.widthM
        bbox_w = abs(opening.bbox.x2 - opening.bbox.x1) * meters_per_norm_x
        bbox_h = abs(opening.bbox.y2 - opening.bbox.y1) * meters_per_norm_y
        derived = max(bbox_w, bbox_h)
        if derived > 0:
            return derived
        if opening.openingType == OpeningType.door:
            return engine_input.rules.defaultDoorWidthM
        return 0.0

    def _opening_height_m(
        self,
        opening: OpeningOverlay,
        meters_per_norm_y: float,
        engine_input: QuantityEngineInput,
    ) -> float:
        if opening.heightM and opening.heightM > 0:
            return opening.heightM
        bbox_h = abs(opening.bbox.y2 - opening.bbox.y1) * meters_per_norm_y
        if bbox_h > 0:
            return bbox_h
        if opening.openingType == OpeningType.door:
            return engine_input.rules.defaultDoorHeightM
        if opening.openingType == OpeningType.window:
            return engine_input.rules.defaultWindowHeightM
        return engine_input.rules.defaultDoorHeightM

    def _opening_area_m2(
        self,
        opening: OpeningOverlay,
        meters_per_norm_x: float,
        meters_per_norm_y: float,
        engine_input: QuantityEngineInput,
    ) -> float:
        width = self._opening_width_m(opening, meters_per_norm_x, meters_per_norm_y, engine_input)
        height = self._opening_height_m(opening, meters_per_norm_y, engine_input)
        return max(width * height, 0.0)

    def _distance_norm(self, p1: NormalizedPoint, p2: NormalizedPoint) -> float:
        dx = p2.x - p1.x
        dy = p2.y - p1.y
        return sqrt(dx * dx + dy * dy)

    def _add_room_schedule_rows(
        self,
        schedule_rows: list[QuantityScheduleRow],
        room: RoomOverlay,
        overlay_ids: list[UUID],
        area: QuantityValue,
        perimeter: QuantityValue,
        skirting: QuantityValue,
        wall_gross: QuantityValue,
        wall_net: QuantityValue,
    ) -> None:
        row_defs = [
            (Trade.finishes, "Floor Area", "floor_area_gross_m2", area),
            (Trade.general, "Perimeter", "perimeter_m", perimeter),
            (Trade.skirting, "Skirting", "skirting_length_m", skirting),
            (Trade.painting, "Wall Area Gross", "wall_area_gross_m2", wall_gross),
            (Trade.painting, "Wall Area Net", "wall_area_net_m2", wall_net),
        ]
        for trade, item, key, value in row_defs:
            schedule_rows.append(
                QuantityScheduleRow(
                    trade=trade,
                    item=item,
                    key=key,
                    value=value.value,
                    unit=value.unit,
                    level=room.level,
                    unitRef=room.unitRef,
                    roomName=room.name,
                    overlayIds=overlay_ids,
                    confidence=value.confidence,
                )
            )

    def _add_total_rows(
        self,
        schedule_rows: list[QuantityScheduleRow],
        totals: dict[str, float],
        prefix: str,
        *,
        level: str | None = None,
    ) -> None:
        total_defs = [
            (Trade.finishes, f"{prefix} Floor Area Total", "floor_area_gross_m2", totals["floor_area_gross_m2"], "m2"),
            (Trade.general, f"{prefix} Perimeter Total", "perimeter_m", totals["perimeter_m"], "m"),
            (Trade.skirting, f"{prefix} Skirting Total", "skirting_length_m", totals["skirting_length_m"], "m"),
            (Trade.painting, f"{prefix} Wall Area Gross Total", "wall_area_gross_m2", totals["wall_area_gross_m2"], "m2"),
            (Trade.painting, f"{prefix} Wall Area Net Total", "wall_area_net_m2", totals["wall_area_net_m2"], "m2"),
        ]
        for trade, item, key, value, unit in total_defs:
            schedule_rows.append(
                QuantityScheduleRow(
                    trade=trade,
                    item=item,
                    key=key,
                    value=value,
                    unit=unit,
                    level=level,
                    overlayIds=[],
                    confidence=Confidence(score=1.0, reason="deterministic aggregate"),
                )
            )
