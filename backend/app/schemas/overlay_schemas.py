from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional, Union
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
    reason: str | None = None


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
    bbox: NormalizedBBox | None = None
    points: list[NormalizedPoint] | None = None
    textSnippet: str | None = Field(default=None, max_length=500)
    source: OverlaySource = OverlaySource.manual
    confidence: Confidence | None = None


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


class OverlayBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    projectId: UUID
    documentId: UUID
    pageId: UUID
    kind: OverlayKind
    source: OverlaySource = OverlaySource.manual
    createdAt: datetime
    updatedAt: datetime
    createdBy: UUID | None = None
    updatedBy: UUID | None = None
    locked: bool = False
    hidden: bool = False
    verified: bool = False
    confidence: Confidence = Field(default_factory=Confidence)
    evidence: list[EvidenceAnchor] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)


class RoomOverlay(OverlayBase):
    kind: Literal[OverlayKind.room] = OverlayKind.room
    name: str = Field(default="Room", max_length=120)
    roomType: RoomType = RoomType.other
    level: str | None = Field(default=None, max_length=60)
    unitRef: str | None = Field(default=None, max_length=60)
    polygon: list[NormalizedPoint] = Field(min_length=3)
    holes: list[list[NormalizedPoint]] = Field(default_factory=list)
    cachedAreaM2: float | None = None
    cachedPerimeterM: float | None = None


class OpeningOverlay(OverlayBase):
    kind: Literal[OverlayKind.opening] = OverlayKind.opening
    openingType: OpeningType = OpeningType.opening
    bbox: NormalizedBBox
    widthM: float | None = None
    heightM: float | None = None
    roomId: UUID | None = None
    wallId: UUID | None = None


class SymbolOverlay(OverlayBase):
    kind: Literal[OverlayKind.symbol] = OverlayKind.symbol
    symbolType: SymbolType = SymbolType.other
    position: NormalizedPoint
    rotationDeg: float = 0.0
    sizeNorm: float = 0.02
    roomId: UUID | None = None
    label: str | None = Field(default=None, max_length=120)


class MeasurementOverlay(OverlayBase):
    kind: Literal[OverlayKind.measurement] = OverlayKind.measurement
    start: NormalizedPoint
    end: NormalizedPoint
    method: MeasurementMethod = MeasurementMethod.scaled
    valueM: float | None = None
    displayUnits: UnitsLength = UnitsLength.m
    label: str | None = Field(default=None, max_length=120)
    roomId: UUID | None = None


class NoteOverlay(OverlayBase):
    kind: Literal[OverlayKind.note] = OverlayKind.note
    position: NormalizedPoint
    text: str = Field(max_length=2000)
    category: str | None = Field(default=None, max_length=60)


Overlay = Union[RoomOverlay, OpeningOverlay, SymbolOverlay, MeasurementOverlay, NoteOverlay]


class OverlayCreateBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    projectId: UUID
    documentId: UUID
    pageId: UUID
    source: OverlaySource = OverlaySource.manual
    verified: bool = False
    hidden: bool = False
    tags: list[str] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)


class RoomCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.room] = OverlayKind.room
    name: str = Field(default="Room", max_length=120)
    roomType: RoomType = RoomType.other
    level: str | None = Field(default=None, max_length=60)
    unitRef: str | None = Field(default=None, max_length=60)
    polygon: list[NormalizedPoint] = Field(min_length=3)
    holes: list[list[NormalizedPoint]] = Field(default_factory=list)


class OpeningCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.opening] = OverlayKind.opening
    openingType: OpeningType = OpeningType.opening
    bbox: NormalizedBBox
    widthM: float | None = None
    heightM: float | None = None
    roomId: UUID | None = None


class SymbolCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.symbol] = OverlayKind.symbol
    symbolType: SymbolType = SymbolType.other
    position: NormalizedPoint
    rotationDeg: float = 0.0
    sizeNorm: float = 0.02
    roomId: UUID | None = None
    label: str | None = Field(default=None, max_length=120)


class MeasurementCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.measurement] = OverlayKind.measurement
    start: NormalizedPoint
    end: NormalizedPoint
    method: MeasurementMethod = MeasurementMethod.scaled
    valueM: float | None = None
    displayUnits: UnitsLength = UnitsLength.m
    label: str | None = Field(default=None, max_length=120)
    roomId: UUID | None = None


class NoteCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.note] = OverlayKind.note
    position: NormalizedPoint
    text: str = Field(max_length=2000)
    category: str | None = Field(default=None, max_length=60)


OverlayCreate = Union[RoomCreate, OpeningCreate, SymbolCreate, MeasurementCreate, NoteCreate]


class OverlayPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verified: Optional[bool] = None
    hidden: Optional[bool] = None
    locked: Optional[bool] = None
    tags: Optional[list[str]] = None
    meta: Optional[dict[str, Any]] = None
    name: Optional[str] = Field(default=None, max_length=120)
    roomType: Optional[RoomType] = None
    level: Optional[str] = Field(default=None, max_length=60)
    unitRef: Optional[str] = Field(default=None, max_length=60)
    polygon: Optional[list[NormalizedPoint]] = None
    holes: Optional[list[list[NormalizedPoint]]] = None
    openingType: Optional[OpeningType] = None
    bbox: Optional[NormalizedBBox] = None
    widthM: Optional[float] = None
    heightM: Optional[float] = None
    roomId: Optional[UUID] = None
    symbolType: Optional[SymbolType] = None
    position: Optional[NormalizedPoint] = None
    rotationDeg: Optional[float] = None
    sizeNorm: Optional[float] = None
    label: Optional[str] = Field(default=None, max_length=120)
    start: Optional[NormalizedPoint] = None
    end: Optional[NormalizedPoint] = None
    method: Optional[MeasurementMethod] = None
    valueM: Optional[float] = None
    displayUnits: Optional[UnitsLength] = None
    text: Optional[str] = Field(default=None, max_length=2000)
    category: Optional[str] = Field(default=None, max_length=60)
