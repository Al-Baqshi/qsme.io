from __future__ import annotations

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.overlay_schemas import (
    Confidence,
    NormalizedPoint,
    OverlaySource,
    RoomType,
    SymbolType,
)

PageType = Literal["floor_plan", "elevation", "section", "site_plan", "notes", "schedule"]


class AISuggestedOverlay(BaseModel):
    """Assistive suggestion only; users should accept/reject before persistence."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal["room", "symbol"]
    source: OverlaySource = OverlaySource.ai
    confidence: Confidence
    accepted: bool = False
    geometry: dict = Field(default_factory=dict)
    metadata: dict = Field(default_factory=dict)


class AIPageClassification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detectedPageType: PageType
    confidence: Confidence


class AIIssue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    confidence: Confidence
    overlayIds: list[UUID] = Field(default_factory=list)


class AIAssistResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pageClassification: AIPageClassification
    suggestedOverlays: list[AISuggestedOverlay] = Field(default_factory=list)
    issues: list[AIIssue] = Field(default_factory=list)


class AIAssistService:
    """AI assistance layer for non-authoritative suggestions only.

    This service intentionally does NOT compute quantities.
    """

    def analyze_page(self, *, text_content: str, page_id: UUID | None = None) -> AIAssistResult:
        classification = self.classify_page(text_content)
        room_suggestions = self.detect_room_label_suggestions(text_content)
        symbol_suggestions = self.detect_symbol_suggestions(text_content)
        issues = self.detect_issues(
            text_content=text_content,
            page_type=classification.detectedPageType,
            suggested_overlays=[*room_suggestions, *symbol_suggestions],
            page_id=page_id,
        )

        return AIAssistResult(
            pageClassification=classification,
            suggestedOverlays=[*room_suggestions, *symbol_suggestions],
            issues=issues,
        )

    def classify_page(self, text_content: str) -> AIPageClassification:
        haystack = text_content.lower()
        rules: list[tuple[PageType, tuple[str, ...], float]] = [
            ("floor_plan", ("floor plan", "kitchen", "living", "bedroom"), 0.9),
            ("elevation", ("elevation", "north elevation", "south elevation"), 0.9),
            ("section", ("section", "sec a-a", "detail section"), 0.85),
            ("site_plan", ("site plan", "lot", "boundary", "setback"), 0.85),
            ("schedule", ("schedule", "door schedule", "window schedule"), 0.9),
            ("notes", ("notes", "general notes", "specification"), 0.8),
        ]

        for page_type, keywords, conf in rules:
            if any(word in haystack for word in keywords):
                return AIPageClassification(
                    detectedPageType=page_type,
                    confidence=Confidence(score=conf, reason="keyword-based AI assist classification"),
                )

        return AIPageClassification(
            detectedPageType="notes",
            confidence=Confidence(score=0.55, reason="low-signal fallback"),
        )

    def detect_room_label_suggestions(self, text_content: str) -> list[AISuggestedOverlay]:
        suggestions: list[AISuggestedOverlay] = []
        pattern = re.compile(r"\b(BEDROOM|BATHROOM|KITCHEN|LIVING|LAUNDRY|GARAGE|STORAGE)\b", re.IGNORECASE)
        found = pattern.findall(text_content)

        for index, raw in enumerate(found[:20]):
            label = raw.strip().lower()
            room_type = label if label in RoomType._value2member_map_ else "other"
            # Assistive placeholder geometry in normalized space; user should edit/confirm.
            x = min(0.1 + (index * 0.07), 0.9)
            y = min(0.1 + (index * 0.05), 0.9)
            poly = [
                NormalizedPoint(x=max(0.0, x - 0.04), y=max(0.0, y - 0.03)).model_dump(),
                NormalizedPoint(x=min(1.0, x + 0.04), y=max(0.0, y - 0.03)).model_dump(),
                NormalizedPoint(x=min(1.0, x + 0.04), y=min(1.0, y + 0.03)).model_dump(),
                NormalizedPoint(x=max(0.0, x - 0.04), y=min(1.0, y + 0.03)).model_dump(),
            ]
            suggestions.append(
                AISuggestedOverlay(
                    kind="room",
                    confidence=Confidence(score=0.72, reason="text label hint"),
                    geometry={"polygon": poly, "holes": []},
                    metadata={"name": raw.title(), "roomType": room_type, "state": "suggested"},
                )
            )

        return suggestions

    def detect_symbol_suggestions(self, text_content: str) -> list[AISuggestedOverlay]:
        symbol_map: list[tuple[str, SymbolType, float]] = [
            ("socket", SymbolType.socket, 0.75),
            ("switch", SymbolType.switch, 0.75),
            ("light", SymbolType.light, 0.75),
            ("plumbing", SymbolType.plumbing_point, 0.7),
        ]
        haystack = text_content.lower()
        suggestions: list[AISuggestedOverlay] = []
        idx = 0
        for token, symbol_type, conf in symbol_map:
            occurrences = haystack.count(token)
            for _ in range(min(occurrences, 20)):
                x = min(0.08 + (idx * 0.06), 0.95)
                y = min(0.15 + (idx * 0.04), 0.95)
                suggestions.append(
                    AISuggestedOverlay(
                        kind="symbol",
                        confidence=Confidence(score=conf, reason="keyword symbol hint"),
                        geometry={"position": NormalizedPoint(x=x, y=y).model_dump()},
                        metadata={"symbolType": symbol_type.value, "state": "suggested"},
                    )
                )
                idx += 1

        return suggestions

    def detect_issues(
        self,
        *,
        text_content: str,
        page_type: PageType,
        suggested_overlays: list[AISuggestedOverlay],
        page_id: UUID | None = None,
    ) -> list[AIIssue]:
        issues: list[AIIssue] = []
        lower = text_content.lower()

        if page_type == "floor_plan" and not any(s.kind == "room" for s in suggested_overlays):
            issues.append(
                AIIssue(
                    code="missing_room_suggestions",
                    message="No room label suggestions detected on floor plan page.",
                    confidence=Confidence(score=0.78, reason="floor plan typically contains room labels"),
                )
            )

        if "scale" not in lower:
            issues.append(
                AIIssue(
                    code="missing_scale_text",
                    message="No scale text detected; calibration may be required.",
                    confidence=Confidence(score=0.7, reason="title block scale string not found"),
                )
            )

        if page_id and len(text_content.strip()) < 10:
            issues.append(
                AIIssue(
                    code="low_text_signal",
                    message="Very low OCR/text signal; consider manual verification.",
                    confidence=Confidence(score=0.8, reason="insufficient extracted text"),
                )
            )

        return issues
