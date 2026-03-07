from __future__ import annotations

import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Document, Project
from app.services.extraction_service import ExtractionService
from app.services.project_knowledge_hub import ProjectContext, ProjectKnowledgeHubService

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str = Field(max_length=255)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    createdAt: datetime


@router.post("", response_model=ProjectResponse)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectResponse:
    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(id=project.id, name=project.name, description=project.description, createdAt=project.created_at)


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)) -> list[ProjectResponse]:
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return [
        ProjectResponse(id=p.id, name=p.name, description=p.description, createdAt=p.created_at)
        for p in projects
    ]


@router.get("/{project_id}/context", response_model=ProjectContext)
def get_project_context(project_id: UUID, db: Session = Depends(get_db)) -> ProjectContext:
    return ProjectKnowledgeHubService(db).get_project_context(project_id)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: UUID, payload: ProjectUpdate, db: Session = Depends(get_db)) -> ProjectResponse:
    """Update project name and/or description."""
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectResponse(id=project.id, name=project.name, description=project.description, createdAt=project.created_at)


class ExtractResponse(BaseModel):
    documentsProcessed: int
    totalPages: int


@router.post("/{project_id}/extract", response_model=ExtractResponse)
def run_extraction(
    project_id: UUID,
    force: bool = Query(False, description="Re-extract all pages even if already processed"),
    db: Session = Depends(get_db),
) -> ExtractResponse:
    """Run extraction (text, tables, pages) for all documents. When force=False, only unprocessed docs; when force=True, re-extract all."""
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    query = db.query(Document).filter(Document.project_id == project_id, Document.storage_uri.isnot(None))
    if not force:
        query = query.filter(Document.status != "processed")
    documents = query.all()
    extraction = ExtractionService(db)
    total_pages = 0
    for doc in documents:
        try:
            pages = extraction.process_document(doc, force=force)
            total_pages += len(pages)
        except Exception:
            doc.status = "error"
            db.add(doc)
            db.commit()
            raise
    return ExtractResponse(documentsProcessed=len(documents), totalPages=total_pages)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: UUID, db: Session = Depends(get_db)) -> None:
    """Delete project and all its data (documents, pages, overlays). Also removes stored files."""
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    storage_root = Path(os.environ.get("OBJECT_STORAGE_DIR", "/tmp/qsme-object-storage"))
    for doc in documents:
        doc_dir = storage_root / str(doc.id)
        if doc_dir.exists():
            try:
                shutil.rmtree(doc_dir)
            except OSError:
                pass
    db.delete(project)
    db.commit()
