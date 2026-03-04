from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.database_models import Project
from app.services.project_knowledge_hub import ProjectContext, ProjectKnowledgeHubService

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
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
