from __future__ import annotations

from fastapi import FastAPI

from app.database import Base, engine
from app.routers import documents, exports, overlays, pages, projects, quantities

app = FastAPI(title="QSME Backend", version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(pages.router)
app.include_router(overlays.router)
app.include_router(quantities.router)
app.include_router(exports.router)
