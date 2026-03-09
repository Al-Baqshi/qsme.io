"""Schemas for structured extraction output."""

from __future__ import annotations

from typing import Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ExtractionSource = Literal["embedded_text", "paddle_structure", "ocr"]
ExtractionRegionType = Literal[
    "title_blocks",
    "text_blocks",
    "table_blocks",
    "image_blocks",
    "figure_blocks",
    "note",
    "drawing_area",
]


class StructuredExtractionRegion(BaseModel):
    """Base region: all regions have these fields."""
    model_config = ConfigDict(extra="allow")

    id: str
    page_id: Union[UUID, str]
    page_number: int
    region_type: ExtractionRegionType
    bbox: list[float] = Field(..., min_length=4, max_length=4)
    confidence: float
    source: ExtractionSource
    raw_text: str
    normalized_text: str


class StructuredTableRegion(StructuredExtractionRegion):
    """Table region: base + title, headers, rows, markdown, html."""
    region_type: Literal["table_blocks"] = "table_blocks"
    title: Optional[str] = None
    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)
    markdown: Optional[str] = None
    html: Optional[str] = None
    table: Optional[list[list[str]]] = None  # raw rows for backward compat


class StructuredImageRegion(StructuredExtractionRegion):
    """Image/figure region: base + image_url and/or figureIndex."""
    region_type: Literal["image_blocks", "figure_blocks"]
    image_url: Optional[str] = None
    figureIndex: Optional[int] = None


# Union for response validation (backend returns dicts; frontend can use discriminated union)
StructuredRegion = Union[StructuredExtractionRegion, StructuredTableRegion, StructuredImageRegion]


class StructuredExtractionPage(BaseModel):
    """Per-page structured extraction: regions with ids, table shape, image_url."""
    pageId: UUID
    pageNumber: int
    regions: list[dict] = Field(default_factory=list)  # flexible for id/table/image_url


# Legacy alias for backward compat
class ExtractionItem(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: Optional[str] = None
    page_id: Union[UUID, str]
    page_number: int
    bbox: list[float] = Field(..., min_length=4, max_length=4)
    region_type: ExtractionRegionType
    source: ExtractionSource
    confidence: float
    raw_text: str
    normalized_text: str
    table: Optional[list[list[str]]] = None
    title: Optional[str] = None
    headers: Optional[list[str]] = None
    rows: Optional[list[list[str]]] = None
    markdown: Optional[str] = None
    html: Optional[str] = None
    image_url: Optional[str] = None
    figureIndex: Optional[int] = None


class StructuredExtractionResponse(BaseModel):
    """Response for GET /pages/{page_id}/structured-extraction. Uses regions."""
    pageId: UUID
    pageNumber: int
    regions: list[dict] = Field(default_factory=list)
    items: Optional[list[dict]] = None  # deprecated; same as regions


__all__ = [
    "ExtractionSource",
    "ExtractionRegionType",
    "StructuredExtractionRegion",
    "StructuredTableRegion",
    "StructuredImageRegion",
    "StructuredExtractionPage",
    "ExtractionItem",
    "StructuredExtractionResponse",
]
