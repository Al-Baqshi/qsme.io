from __future__ import annotations

import csv
import os
from datetime import datetime
from pathlib import Path
from uuid import UUID

import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.models.database_models import ExportJob
from app.schemas.quantity_schemas import ProjectQuantitiesResponse


class ExportEngine:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.export_root = Path(os.getenv("EXPORT_STORAGE_DIR", "/tmp/qsme-exports"))
        self.export_prefix = os.getenv("EXPORT_STORAGE_PREFIX", "object://qsme-exports")
        self.export_root.mkdir(parents=True, exist_ok=True)

    def export(self, project_id: UUID, quantities: ProjectQuantitiesResponse, export_format: str) -> dict:
        export_format = export_format.lower()
        if export_format not in {"csv", "xlsx", "pdf"}:
            raise ValueError("Unsupported export format. Use csv, xlsx, or pdf")

        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        out_dir = self.export_root / str(project_id)
        out_dir.mkdir(parents=True, exist_ok=True)

        if export_format == "csv":
            path = out_dir / f"schedule-{timestamp}.csv"
            self._write_csv(path, quantities)
        elif export_format == "xlsx":
            path = out_dir / f"schedule-{timestamp}.xlsx"
            self._write_xlsx(path, quantities)
        else:
            path = out_dir / f"summary-{timestamp}.pdf"
            self._write_pdf(path, quantities)

        uri = f"{self.export_prefix}/{project_id}/{path.name}"
        job = ExportJob(project_id=project_id, format=export_format, status="completed", download_uri=uri)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        return {
            "id": str(job.id),
            "projectId": str(project_id),
            "format": export_format,
            "status": "completed",
            "downloadUri": uri,
            "generatedAt": quantities.generatedAt,
        }

    def _write_csv(self, path: Path, quantities: ProjectQuantitiesResponse) -> None:
        rows = self._schedule_rows(quantities)
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["trade", "item", "key", "value", "unit", "level", "roomName"])
            writer.writeheader()
            for row in rows:
                writer.writerow(row)

    def _write_xlsx(self, path: Path, quantities: ProjectQuantitiesResponse) -> None:
        room_df = pd.DataFrame(
            [
                {
                    "roomName": room.roomName,
                    "level": room.level,
                    "unitRef": room.unitRef,
                    "floorAreaGross": room.floorAreaGross.value if room.floorAreaGross else 0.0,
                    "skirtingLength": room.skirtingLength.value if room.skirtingLength else 0.0,
                    "wallAreaNet": room.wallAreaNet.value if room.wallAreaNet else 0.0,
                }
                for room in quantities.rooms
            ]
        )
        schedule_df = pd.DataFrame(self._schedule_rows(quantities))
        totals_df = pd.DataFrame(self._project_totals(quantities), index=[0])

        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            room_df.to_excel(writer, sheet_name="Room schedule", index=False)
            schedule_df[schedule_df["trade"] == "skirting"].to_excel(writer, sheet_name="Skirting schedule", index=False)
            schedule_df[schedule_df["trade"] == "electrical"].to_excel(writer, sheet_name="Electrical schedule", index=False)
            totals_df.to_excel(writer, sheet_name="Project totals", index=False)

    def _write_pdf(self, path: Path, quantities: ProjectQuantitiesResponse) -> None:
        c = canvas.Canvas(str(path), pagesize=A4)
        width, height = A4
        y = height - 40

        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, f"QSME Project Summary - {quantities.projectId}")
        y -= 24

        c.setFont("Helvetica", 10)
        totals = self._project_totals(quantities)
        for key, value in totals.items():
            c.drawString(40, y, f"{key}: {value}")
            y -= 14

        y -= 8
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y, "Room Schedule")
        y -= 16
        c.setFont("Helvetica", 9)
        for room in quantities.rooms[:30]:
            line = (
                f"{room.roomName} | area={room.floorAreaGross.value if room.floorAreaGross else 0:.2f} m2 | "
                f"skirting={room.skirtingLength.value if room.skirtingLength else 0:.2f} m"
            )
            c.drawString(40, y, line)
            y -= 12
            if y < 60:
                c.showPage()
                y = height - 40
                c.setFont("Helvetica", 9)

        c.save()

    def _schedule_rows(self, quantities: ProjectQuantitiesResponse) -> list[dict]:
        return [
            {
                "trade": row.trade.value if hasattr(row.trade, "value") else row.trade,
                "item": row.item,
                "key": row.key,
                "value": row.value,
                "unit": row.unit.value if hasattr(row.unit, "value") else row.unit,
                "level": row.level,
                "roomName": row.roomName,
                "overlayIds": ",".join(str(x) for x in row.overlayIds),
                "confidence": row.confidence.score,
            }
            for row in quantities.scheduleRows
        ]

    def _project_totals(self, quantities: ProjectQuantitiesResponse) -> dict:
        schedule = self._schedule_rows(quantities)
        skirting_total = sum((r.skirtingLength.value if r.skirtingLength else 0.0) for r in quantities.rooms)
        electrical_total = sum(float(r["value"]) for r in schedule if r["trade"] == "electrical" and "total" not in str(r["key"]))
        room_area_total = sum((r.floorAreaGross.value if r.floorAreaGross else 0.0) for r in quantities.rooms)
        return {
            "room_count": len(quantities.rooms),
            "room_area_total_m2": round(room_area_total, 3),
            "skirting_total_m": round(skirting_total, 3),
            "electrical_points_total": round(electrical_total, 3),
        }
