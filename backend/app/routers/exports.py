from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.quantity_service import QuantityService

router = APIRouter(tags=["exports"])


class ExportRequest(BaseModel):
    format: Literal["csv", "xlsx", "pdf"] = "xlsx"


@router.post("/projects/{project_id}/export")
def export_project_quantities(project_id: UUID, payload: ExportRequest, db: Session = Depends(get_db)) -> dict:
    return QuantityService(db).queue_export(project_id, payload.format)
