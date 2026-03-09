#!/usr/bin/env python3
"""
One-time migration: backfill region ids (r0, r1, ...) and table fields (title, headers, rows, markdown, html)
on existing page.structured_content. Run from repo root:

  cd backend && .venv/bin/python scripts/migrate_structured_content_ids.py

Or with pip-installed env:
  cd backend && python scripts/migrate_structured_content_ids.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Load backend/.env
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"
if env_path.exists():
    try:
        import dotenv
        dotenv.load_dotenv(env_path)
    except ImportError:
        pass

sys.path.insert(0, str(backend_dir))

# Set default DATABASE_URL if missing (e.g. for local dev)
if not os.getenv("DATABASE_URL"):
    os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/qsme")


def main() -> int:
    from app.database import SessionLocal
    from app.models.database_models import Page
    from app.services.extraction_service import ExtractionService

    db = SessionLocal()
    try:
        pages = db.query(Page).filter(Page.structured_content.isnot(None)).all()
        pages_with_content = [p for p in pages if p.structured_content and len(p.structured_content) > 0]
        if not pages_with_content:
            print("No pages with structured_content found. Nothing to migrate.")
            return 0

        svc = ExtractionService(db)
        updated = 0
        for page in pages_with_content:
            if svc.migrate_page_structured_content(page):
                updated += 1
        db.commit()
        print(f"Migration complete: {len(pages_with_content)} page(s) with structured_content processed, {updated} had ids backfilled.")
        return 0
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
