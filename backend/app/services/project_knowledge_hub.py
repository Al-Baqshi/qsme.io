from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.domain.entities.context import ProjectContext
from app.models.database_models import Document, ExportJob, Overlay, Page, Project, QuantitySnapshot


class ProjectKnowledgeHubService:
    """Read-only project hub used by agents to avoid reprocessing source PDFs."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_project_context(self, project_id: UUID) -> ProjectContext:
        project = self.db.get(Project, project_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")

        documents = (
            self.db.query(Document)
            .filter(Document.project_id == project_id)
            .order_by(Document.created_at.asc())
            .all()
        )
        document_ids = [doc.id for doc in documents]

        pages: list[Page] = []
        overlays: list[Overlay] = []
        if document_ids:
            pages = (
                self.db.query(Page)
                .filter(Page.document_id.in_(document_ids))
                .order_by(Page.document_id.asc(), Page.page_number.asc())
                .all()
            )
            page_ids = [p.id for p in pages]
            if page_ids:
                overlays = (
                    self.db.query(Overlay)
                    .filter(Overlay.page_id.in_(page_ids))
                    .order_by(Overlay.updated_at.asc())
                    .all()
                )

        latest_snapshot = (
            self.db.query(QuantitySnapshot)
            .filter(QuantitySnapshot.project_id == project_id)
            .order_by(QuantitySnapshot.version.desc(), QuantitySnapshot.created_at.desc())
            .first()
        )

        export_jobs = (
            self.db.query(ExportJob)
            .filter(ExportJob.project_id == project_id)
            .order_by(ExportJob.created_at.desc())
            .all()
        )

        overlay_version_sum = sum((o.version or 0) for o in overlays)
        overlay_updated_epoch = max((int(o.updated_at.timestamp()) for o in overlays), default=0)
        snapshot_version = latest_snapshot.version if latest_snapshot else 0
        snapshot_epoch = int(latest_snapshot.created_at.timestamp()) if latest_snapshot else 0

        context_version = max(1, overlay_version_sum + overlay_updated_epoch + snapshot_version + snapshot_epoch)
        needs_recompute = bool(overlays) and (
            latest_snapshot is None
            or overlay_updated_epoch > snapshot_epoch
        )

        quantities_payload = latest_snapshot.payload if latest_snapshot else None
        issues = []
        if quantities_payload and isinstance(quantities_payload, dict):
            issues = list(quantities_payload.get("issues", []))

        return ProjectContext(
            project={
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "createdAt": project.created_at,
            },
            documents=[
                {
                    "id": d.id,
                    "projectId": d.project_id,
                    "filename": d.filename,
                    "storageUri": d.storage_uri,
                    "status": d.status,
                    "createdAt": d.created_at,
                }
                for d in documents
            ],
            pages=[
                {
                    "id": p.id,
                    "documentId": p.document_id,
                    "pageNumber": p.page_number,
                    "imageUrl": p.image_uri,
                    "detectedPageType": p.page_type,
                    "textContent": p.text_content,
                    "structuredContent": p.structured_content or [],
                    "pageScale": p.page_scale,
                    "extractionSource": getattr(p, "extraction_source", None),
                }
                for p in pages
            ],
            overlays=[
                {
                    "id": o.id,
                    "projectId": o.project_id,
                    "documentId": o.document_id,
                    "pageId": o.page_id,
                    "kind": o.kind,
                    "source": o.source,
                    "version": o.version,
                    "confidence": o.confidence,
                    "geometry": o.payload,
                    "metadata": o.meta,
                    "updatedAt": o.updated_at,
                }
                for o in overlays
            ],
            quantities=quantities_payload,
            issues=issues,
            exports=[
                {
                    "id": e.id,
                    "projectId": e.project_id,
                    "format": e.format,
                    "status": e.status,
                    "downloadUri": e.download_uri,
                    "createdAt": e.created_at,
                }
                for e in export_jobs
            ],
            contextVersion=context_version,
            needsRecompute=needs_recompute,
        )
