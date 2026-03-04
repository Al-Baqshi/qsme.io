from __future__ import annotations

from uuid import UUID

from app.database import SessionLocal
from app.models.database_models import Document
from app.services.extraction_service import ExtractionService


def run_extraction(document_id: UUID) -> None:
    """Background worker entrypoint for PDF extraction pipeline."""
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None:
            return
        service = ExtractionService(db)
        service.process_document(document)
    except Exception:
        if "document" in locals() and document is not None:
            document.status = "failed"
            db.add(document)
            db.commit()
        raise
    finally:
        db.close()
