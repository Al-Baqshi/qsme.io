"""Project context DTO: read model for project hub."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ProjectContext(BaseModel):
    """Full project context for agents and API. No infrastructure types."""

    project: dict
    documents: list[dict] = Field(default_factory=list)
    pages: list[dict] = Field(default_factory=list)
    overlays: list[dict] = Field(default_factory=list)
    quantities: Optional[dict] = None
    issues: list[str] = Field(default_factory=list)
    exports: list[dict] = Field(default_factory=list)
    contextVersion: int
    needsRecompute: bool
