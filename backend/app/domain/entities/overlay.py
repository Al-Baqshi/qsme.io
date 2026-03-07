"""Overlay entities. Depend only on domain value_objects."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.value_objects.overlay import (
    Confidence,
    EvidenceAnchor,
    MeasurementMethod,
    NormalizedBBox,
    NormalizedPoint,
    OpeningType,
    OverlayKind,
    OverlaySource,
    RoomType,
    SymbolType,
    UnitsLength,
)


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
    createdBy: Optional[UUID] = None
    updatedBy: Optional[UUID] = None
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
    level: Optional[str] = Field(default=None, max_length=60)
    unitRef: Optional[str] = Field(default=None, max_length=60)
    polygon: list[NormalizedPoint] = Field(min_length=3)
    holes: list[list[NormalizedPoint]] = Field(default_factory=list)
    cachedAreaM2: Optional[float] = None
    cachedPerimeterM: Optional[float] = None


class OpeningOverlay(OverlayBase):
    kind: Literal[OverlayKind.opening] = OverlayKind.opening
    openingType: OpeningType = OpeningType.opening
    bbox: NormalizedBBox
    widthM: Optional[float] = None
    heightM: Optional[float] = None
    roomId: Optional[UUID] = None
    wallId: Optional[UUID] = None


class SymbolOverlay(OverlayBase):
    kind: Literal[OverlayKind.symbol] = OverlayKind.symbol
    symbolType: SymbolType = SymbolType.other
    position: NormalizedPoint
    rotationDeg: float = 0.0
    sizeNorm: float = 0.02
    roomId: Optional[UUID] = None
    label: Optional[str] = Field(default=None, max_length=120)


class MeasurementOverlay(OverlayBase):
    kind: Literal[OverlayKind.measurement] = OverlayKind.measurement
    start: NormalizedPoint
    end: NormalizedPoint
    method: MeasurementMethod = MeasurementMethod.scaled
    valueM: Optional[float] = None
    displayUnits: UnitsLength = UnitsLength.m
    label: Optional[str] = Field(default=None, max_length=120)
    roomId: Optional[UUID] = None


class NoteOverlay(OverlayBase):
    kind: Literal[OverlayKind.note] = OverlayKind.note
    position: NormalizedPoint
    text: str = Field(max_length=2000)
    category: Optional[str] = Field(default=None, max_length=60)


Overlay = Union[
    RoomOverlay, OpeningOverlay, SymbolOverlay, MeasurementOverlay, NoteOverlay
]


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
    level: Optional[str] = Field(default=None, max_length=60)
    unitRef: Optional[str] = Field(default=None, max_length=60)
    polygon: list[NormalizedPoint] = Field(min_length=3)
    holes: list[list[NormalizedPoint]] = Field(default_factory=list)


class OpeningCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.opening] = OverlayKind.opening
    openingType: OpeningType = OpeningType.opening
    bbox: NormalizedBBox
    widthM: Optional[float] = None
    heightM: Optional[float] = None
    roomId: Optional[UUID] = None


class SymbolCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.symbol] = OverlayKind.symbol
    symbolType: SymbolType = SymbolType.other
    position: NormalizedPoint
    rotationDeg: float = 0.0
    sizeNorm: float = 0.02
    roomId: Optional[UUID] = None
    label: Optional[str] = Field(default=None, max_length=120)


class MeasurementCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.measurement] = OverlayKind.measurement
    start: NormalizedPoint
    end: NormalizedPoint
    method: MeasurementMethod = MeasurementMethod.scaled
    valueM: Optional[float] = None
    displayUnits: UnitsLength = UnitsLength.m
    label: Optional[str] = Field(default=None, max_length=120)
    roomId: Optional[UUID] = None


class NoteCreate(OverlayCreateBase):
    kind: Literal[OverlayKind.note] = OverlayKind.note
    position: NormalizedPoint
    text: str = Field(max_length=2000)
    category: Optional[str] = Field(default=None, max_length=60)


OverlayCreate = Union[
    RoomCreate, OpeningCreate, SymbolCreate, MeasurementCreate, NoteCreate
]


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
