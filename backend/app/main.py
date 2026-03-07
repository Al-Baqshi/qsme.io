from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend directory; .env.local overrides for local/laptop runs
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")
load_dotenv(_backend_dir / ".env.local")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.routers import documents, exports, overlays, pages, projects, quantities

app = FastAPI(title="QSME Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    # Ensure pages.structured_content exists (backward compat for existing DBs)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE pages ADD COLUMN IF NOT EXISTS structured_content JSONB DEFAULT '[]'"))
            conn.execute(text("ALTER TABLE pages ADD COLUMN IF NOT EXISTS extraction_source VARCHAR(40)"))
            conn.execute(text("ALTER TABLE pages ADD COLUMN IF NOT EXISTS raw_structure JSONB"))
            conn.commit()
    except Exception:
        pass  # Column exists or DB error; ignore


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(pages.router)
app.include_router(overlays.router)
app.include_router(quantities.router)
app.include_router(exports.router)
