"""Quantity value objects. Depends only on domain overlay value objects."""

from __future__ import annotations

from enum import Enum
from typing import Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.value_objects.overlay import Confidence, NormalizedPoint, RoomType, UnitsLength


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
    unit: Union[UnitsLength, UnitsArea, Literal["count", "m3"]]
    confidence: Confidence = Field(default_factory=Confidence)
    method: Literal["manual", "computed", "assumed", "ai"] = "computed"
    notes: Optional[str] = Field(default=None, max_length=500)


class PageScale(BaseModel):
    model_config = ConfigDict(extra="forbid")
    method: Literal["none", "title_block", "calibration"] = "none"
    metersPerNormX: Optional[float] = None
    metersPerNormY: Optional[float] = None
    declaredScaleText: Optional[str] = None
    units: UnitsLength = UnitsLength.m
    calibrationLine: Optional[tuple[NormalizedPoint, NormalizedPoint]] = None
    calibrationRealLengthM: Optional[float] = None
    confidence: Confidence = Field(default_factory=Confidence)


class QuantityRulesProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profileName: str = Field(max_length=80)
    defaultWallHeightM: float = 2.4
    subtractDoorsFromSkirting: bool = True
    subtractWindowsFromSkirting: bool = False
    defaultDoorWidthM: float = 0.82
    defaultDoorHeightM: float = 2.04
    defaultWindowHeightM: float = 1.2
    ignoreRoomTypesForSkirting: list[RoomType] = Field(
        default_factory=lambda: [RoomType.stairs]
    )
