from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.quantity_schemas import ProjectQuantitiesResponse
from app.services.quantity_service import QuantityService

router = APIRouter(tags=["quantities"])


@router.get("/projects/{project_id}/quantities", response_model=ProjectQuantitiesResponse)
def get_project_quantities(project_id: UUID, db: Session = Depends(get_db)) -> ProjectQuantitiesResponse:
    return QuantityService(db).get_project_quantities(project_id)
