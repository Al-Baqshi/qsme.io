from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Document, Project
from app.services.extraction_service import ExtractionService

router = APIRouter(tags=["documents"])


class DocumentResponse(BaseModel):
    id: UUID
    projectId: UUID
    filename: str
    storageUri: str | None
    status: str
    createdAt: datetime


@router.post("/projects/{project_id}/documents", response_model=DocumentResponse)
async def create_document(
    project_id: UUID,
    file: UploadFile | None = File(default=None),
    filename: str | None = Form(default=None),
    storageUri: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    resolved_filename = filename or (file.filename if file else None)
    if not resolved_filename:
        raise HTTPException(status_code=400, detail="filename or file is required")

    document = Document(project_id=project_id, filename=resolved_filename, storage_uri=storageUri)
    db.add(document)
    db.commit()
    db.refresh(document)

    file_bytes = await file.read() if file else None
    ExtractionService(db).process_document(
        document,
        pdf_bytes=file_bytes,
        original_filename=resolved_filename,
    )

    return DocumentResponse(
        id=document.id,
        projectId=document.project_id,
        filename=document.filename,
        storageUri=document.storage_uri,
        status=document.status,
        createdAt=document.created_at,
    )
