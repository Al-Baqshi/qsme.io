"""Quantity entities. Depend only on domain value_objects."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.value_objects.overlay import Confidence, EvidenceAnchor
from app.domain.value_objects.quantity import (
    PageScale,
    QuantityRulesProfile,
    QuantityScope,
    QuantityValue,
    Trade,
    UnitsArea,
    UnitsLength,
)


class QuantityScheduleRow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    trade: Trade
    item: str = Field(max_length=120)
    key: str = Field(max_length=120)
    value: float
    unit: Union[UnitsLength, UnitsArea, Literal["count", "m3"]]
    level: Optional[str] = None
    unitRef: Optional[str] = None
    roomName: Optional[str] = None
    overlayIds: list[UUID] = Field(default_factory=list)
    confidence: Confidence = Field(default_factory=Confidence)


class RoomQuantityBundle(BaseModel):
    model_config = ConfigDict(extra="forbid")
    roomId: UUID
    roomName: str
    level: Optional[str] = None
    unitRef: Optional[str] = None
    floorAreaGross: Optional[QuantityValue] = None
    floorAreaNet: Optional[QuantityValue] = None
    perimeter: Optional[QuantityValue] = None
    skirtingLength: Optional[QuantityValue] = None
    wallAreaGross: Optional[QuantityValue] = None
    wallAreaNet: Optional[QuantityValue] = None
    extras: dict[str, QuantityValue] = Field(default_factory=dict)


class ProjectQuantitiesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    projectId: UUID
    generatedAt: datetime
    version: int
    rooms: list[RoomQuantityBundle] = Field(default_factory=list)
    scheduleRows: list[QuantityScheduleRow] = Field(default_factory=list)
    issues: list[str] = Field(default_factory=list)


class QuantityEngineInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    projectId: UUID
    documentId: Optional[UUID] = None
    rules: QuantityRulesProfile
    scalesByPage: dict[UUID, PageScale] = Field(default_factory=dict)
    overlayIds: list[UUID] = Field(default_factory=list)


class QuantityItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    projectId: UUID
    trade: Trade
    key: str = Field(max_length=120)
    scope: QuantityScope
    documentId: Optional[UUID] = None
    pageId: Optional[UUID] = None
    roomId: Optional[UUID] = None
    overlayIds: list[UUID] = Field(default_factory=list)
    result: QuantityValue
    evidence: list[EvidenceAnchor] = Field(default_factory=list)
    createdAt: datetime
    updatedAt: datetime
    version: int = 1
