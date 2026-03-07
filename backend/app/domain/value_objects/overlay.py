"""Overlay value objects. No dependencies on infrastructure."""

from __future__ import annotations

from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, confloat


class UnitsLength(str, Enum):
    mm = "mm"
    cm = "cm"
    m = "m"
    inch = "in"
    ft = "ft"


class OverlaySource(str, Enum):
    manual = "manual"
    auto = "auto"
    ai = "ai"
    imported = "imported"


class Confidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    score: confloat(ge=0.0, le=1.0) = 1.0
    reason: Optional[str] = None


class NormalizedPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x: confloat(ge=0.0, le=1.0)
    y: confloat(ge=0.0, le=1.0)


class NormalizedBBox(BaseModel):
    model_config = ConfigDict(extra="forbid")
    x1: confloat(ge=0.0, le=1.0)
    y1: confloat(ge=0.0, le=1.0)
    x2: confloat(ge=0.0, le=1.0)
    y2: confloat(ge=0.0, le=1.0)


class EvidenceAnchor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pageId: UUID
    bbox: Optional[NormalizedBBox] = None
    points: Optional[list[NormalizedPoint]] = None
    textSnippet: Optional[str] = Field(default=None, max_length=500)
    source: OverlaySource = OverlaySource.manual
    confidence: Optional[Confidence] = None


class OverlayKind(str, Enum):
    room = "room"
    opening = "opening"
    symbol = "symbol"
    measurement = "measurement"
    note = "note"


class RoomType(str, Enum):
    bedroom = "bedroom"
    bathroom = "bathroom"
    kitchen = "kitchen"
    living = "living"
    corridor = "corridor"
    laundry = "laundry"
    garage = "garage"
    storage = "storage"
    stairs = "stairs"
    other = "other"


class OpeningType(str, Enum):
    door = "door"
    window = "window"
    opening = "opening"
    slider = "slider"
    garage_door = "garage_door"


class SymbolType(str, Enum):
    socket = "socket"
    switch = "switch"
    light = "light"
    data = "data"
    tv = "tv"
    smoke_alarm = "smoke_alarm"
    plumbing_point = "plumbing_point"
    fixture = "fixture"
    other = "other"


class MeasurementMethod(str, Enum):
    scaled = "scaled"
    manual = "manual"
    ocr = "ocr"
    ai = "ai"
