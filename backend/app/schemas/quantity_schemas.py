from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.overlay_schemas import Confidence, EvidenceAnchor, NormalizedPoint, RoomType, UnitsLength


class UnitsArea(str, Enum):
    mm2 = "mm2"
    cm2 = "cm2"
    m2 = "m2"
    ft2 = "ft2"


class Trade(str, Enum):
    general = "general"
    finishes = "finishes"
    skirting = "skirting"
    painting = "painting"
    electrical = "electrical"
    plumbing = "plumbing"
    concrete = "concrete"


class QuantityScope(str, Enum):
    project = "project"
    document = "document"
    page = "page"
    room = "room"
    opening = "opening"
    symbol = "symbol"


class QuantityValue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: float
    unit: UnitsLength | UnitsArea | Literal["count", "m3"]
    confidence: Confidence = Field(default_factory=Confidence)
    method: Literal["manual", "computed", "assumed", "ai"] = "computed"
    notes: str | None = Field(default=None, max_length=500)


class QuantityItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    projectId: UUID
    trade: Trade
    key: str = Field(max_length=120)
    scope: QuantityScope
    documentId: UUID | None = None
    pageId: UUID | None = None
    roomId: UUID | None = None
    overlayIds: list[UUID] = Field(default_factory=list)
    result: QuantityValue
    evidence: list[EvidenceAnchor] = Field(default_factory=list)
    createdAt: datetime
    updatedAt: datetime
    version: int = 1


class RoomQuantityBundle(BaseModel):
    model_config = ConfigDict(extra="forbid")

    roomId: UUID
    roomName: str
    level: str | None = None
    unitRef: str | None = None
    floorAreaGross: QuantityValue | None = None
    floorAreaNet: QuantityValue | None = None
    perimeter: QuantityValue | None = None
    skirtingLength: QuantityValue | None = None
    wallAreaGross: QuantityValue | None = None
    wallAreaNet: QuantityValue | None = None
    extras: dict[str, QuantityValue] = Field(default_factory=dict)


class QuantityScheduleRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trade: Trade
    item: str = Field(max_length=120)
    key: str = Field(max_length=120)
    value: float
    unit: UnitsLength | UnitsArea | Literal["count", "m3"]
    level: str | None = None
    unitRef: str | None = None
    roomName: str | None = None
    overlayIds: list[UUID] = Field(default_factory=list)
    confidence: Confidence = Field(default_factory=Confidence)


class ProjectQuantitiesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    projectId: UUID
    generatedAt: datetime
    version: int
    rooms: list[RoomQuantityBundle] = Field(default_factory=list)
    scheduleRows: list[QuantityScheduleRow] = Field(default_factory=list)
    issues: list[str] = Field(default_factory=list)


class QuantityRulesProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profileName: str = Field(max_length=80)
    defaultWallHeightM: float = 2.4
    subtractDoorsFromSkirting: bool = True
    subtractWindowsFromSkirting: bool = False
    defaultDoorWidthM: float = 0.82
    defaultDoorHeightM: float = 2.04
    defaultWindowHeightM: float = 1.2
    ignoreRoomTypesForSkirting: list[RoomType] = Field(default_factory=lambda: [RoomType.stairs])


class PageScale(BaseModel):
    model_config = ConfigDict(extra="forbid")

    method: Literal["none", "title_block", "calibration"] = "none"
    metersPerNormX: float | None = None
    metersPerNormY: float | None = None
    declaredScaleText: str | None = None
    units: UnitsLength = UnitsLength.m
    calibrationLine: tuple[NormalizedPoint, NormalizedPoint] | None = None
    calibrationRealLengthM: float | None = None
    confidence: Confidence = Field(default_factory=Confidence)


class QuantityEngineInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    projectId: UUID
    documentId: UUID | None = None
    rules: QuantityRulesProfile
    scalesByPage: dict[UUID, PageScale] = Field(default_factory=dict)
    overlayIds: list[UUID] = Field(default_factory=list)
