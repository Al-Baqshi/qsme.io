#!/usr/bin/env python3
"""
Test database migration and storage. Run from repo root:
  cd backend && pip install -q python-dotenv && python scripts/check_migration_and_storage.py
Or with venv:
  cd backend && .venv/bin/python scripts/check_migration_and_storage.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Load backend/.env
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"
if env_path.exists():
    import dotenv
    dotenv.load_dotenv(env_path)
    print(f"[OK] Loaded {env_path}")
else:
    print(f"[WARN] No {env_path} — using current env")

sys.path.insert(0, str(backend_dir))


def test_db():
    print("\n--- Database ---")
    url = os.getenv("DATABASE_URL", "")
    if not url:
        print("[FAIL] DATABASE_URL not set")
        return False
    if "@" in url and "://" in url:
        scheme_end = url.index("://") + 3
        rest = url[scheme_end:]
        if "@" in rest:
            user_part, host_part = rest.split("@", 1)
            if ":" in user_part:
                user = user_part.split(":")[0]
                url_display = url[:scheme_end] + user + ":****@" + host_part
            else:
                url_display = url
        else:
            url_display = url
    else:
        url_display = url[:50] + "..." if len(url) > 50 else url
    print(f"  DATABASE_URL: {url_display}")

    try:
        from sqlalchemy import text
        from app.infrastructure.database.connection import engine, _normalize_database_url
        from app.infrastructure.database.models import Base
        norm_url = _normalize_database_url(url)
        if norm_url != url:
            print("  (normalized to postgresql+psycopg://...)")
        Base.metadata.create_all(bind=engine)
        print("  [OK] Tables created/verified")
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("  [OK] Connection and query OK")
        return True
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False


def test_storage():
    print("\n--- Object storage ---")
    storage_dir = os.getenv("OBJECT_STORAGE_DIR", "/tmp/qsme-object-storage")
    storage_prefix = os.getenv("OBJECT_STORAGE_PREFIX", "object://qsme")
    print(f"  OBJECT_STORAGE_DIR: {storage_dir}")
    print(f"  OBJECT_STORAGE_PREFIX: {storage_prefix}")

    r2_bucket = os.getenv("R2_BUCKET")
    r2_endpoint = os.getenv("R2_ENDPOINT")
    if r2_bucket and r2_endpoint:
        print(f"  R2_BUCKET: {r2_bucket}")
        print(f"  R2_ENDPOINT: {r2_endpoint[:50]}...")
        print("  [INFO] R2 env set — app still uses local disk until R2 backend is wired")

    path = Path(storage_dir)
    try:
        path.mkdir(parents=True, exist_ok=True)
        test_file = path / ".qsme_test"
        test_file.write_text("ok")
        assert test_file.read_text() == "ok"
        test_file.unlink()
        print("  [OK] Local storage dir writable and readable")
        return True
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False


def main():
    print("QSME — migration and storage check")
    db_ok = test_db()
    storage_ok = test_storage()
    print()
    if db_ok and storage_ok:
        print("All checks passed.")
        return 0
    print("Some checks failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
