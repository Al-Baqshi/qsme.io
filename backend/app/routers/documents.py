from __future__ import annotations

from datetime import datetime
from typing import Optional
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
    storageUri: Optional[str] = None
    status: str
    createdAt: datetime


@router.post("/projects/{project_id}/documents", response_model=DocumentResponse)
async def create_document(
    project_id: UUID,
    file: Optional[UploadFile] = File(default=None),
    filename: Optional[str] = Form(default=None),
    storageUri: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    resolved_filename = filename or (file.filename if file else None)
    if not resolved_filename:
        raise HTTPException(status_code=400, detail="filename or file is required")

    document = Document(project_id=project_id, filename=resolved_filename, storage_uri=storageUri, status="uploaded")
    db.add(document)
    db.commit()
    db.refresh(document)

    if file and file.file:
        file_bytes = await file.read()
        if file_bytes:
            ext_service = ExtractionService(db)
            ext_service.store_pdf_only(
                document,
                file_bytes,
                original_filename=resolved_filename,
            )
    elif storageUri:
        db.refresh(document)
    else:
        raise HTTPException(status_code=400, detail="file or storageUri is required")

    return DocumentResponse(
        id=document.id,
        projectId=document.project_id,
        filename=document.filename,
        storageUri=document.storage_uri,
        status=document.status,
        createdAt=document.created_at,
    )


class CreatePagesResponse(BaseModel):
    pagesCreated: int


@router.post("/documents/{document_id}/create-pages", response_model=CreatePagesResponse)
def create_document_pages(document_id: UUID, db: Session = Depends(get_db)) -> CreatePagesResponse:
    """Render PDF to page images so the document view can show pages. Call after upload. Does not run text/OCR extraction."""
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.storage_uri:
        raise HTTPException(status_code=400, detail="Document has no stored PDF")
    if document.pages:
        return CreatePagesResponse(pagesCreated=len(document.pages))
    pages = ExtractionService(db).create_pages_from_pdf(document)
    return CreatePagesResponse(pagesCreated=len(pages))
