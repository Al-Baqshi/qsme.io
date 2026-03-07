"""Domain layer: entities, value objects, and contracts.

This layer has no dependency on infrastructure or interfaces.
Only standard library and pydantic are used.
"""

from app.domain.contracts import (
    IDocumentRepository,
    IExportJobRepository,
    IPageClassifier,
    IPdfExtractor,
    IProjectRepository,
    IPageRepository,
    IOverlayRepository,
    IQuantitySnapshotRepository,
    IStorageBackend,
)
from app.domain.value_objects.overlay import (
    Confidence,
    EvidenceAnchor,
    NormalizedBBox,
    NormalizedPoint,
    OpeningType,
    OverlayKind,
    OverlaySource,
    RoomType,
    SymbolType,
    UnitsLength,
)
from app.domain.value_objects.quantity import (
    PageScale,
    QuantityRulesProfile,
    QuantityScope,
    Trade,
    UnitsArea,
)
from app.domain.entities.overlay import (
    MeasurementOverlay,
    NoteOverlay,
    OpeningOverlay,
    OverlayCreateBase,
    RoomOverlay,
    SymbolOverlay,
)
from app.domain.entities.quantity import (
    ProjectQuantitiesResponse,
    QuantityScheduleRow,
    QuantityValue,
    RoomQuantityBundle,
)
from app.domain.entities.context import ProjectContext

__all__ = [
    "Confidence",
    "EvidenceAnchor",
    "NormalizedBBox",
    "NormalizedPoint",
    "OpeningType",
    "OverlayKind",
    "OverlaySource",
    "RoomType",
    "SymbolType",
    "UnitsLength",
    "PageScale",
    "QuantityRulesProfile",
    "QuantityScope",
    "Trade",
    "UnitsArea",
    "MeasurementOverlay",
    "NoteOverlay",
    "OpeningOverlay",
    "OverlayCreateBase",
    "RoomOverlay",
    "SymbolOverlay",
    "ProjectQuantitiesResponse",
    "ProjectContext",
    "QuantityScheduleRow",
    "QuantityValue",
    "RoomQuantityBundle",
    "IDocumentRepository",
    "IExportJobRepository",
    "IPageClassifier",
    "IPdfExtractor",
    "IProjectRepository",
    "IPageRepository",
    "IOverlayRepository",
    "IQuantitySnapshotRepository",
    "IStorageBackend",
]
