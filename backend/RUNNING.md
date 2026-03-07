# Run the backend

**Activate env (optional venv):**
```bash
cd backend
python -m venv .venv
. .venv/bin/activate   # or: source .venv/bin/activate
pip install -r requirements.txt
```

**Local Postgres (Homebrew):** Start Postgres, create the DB, set env:
```bash
brew services start postgresql@16
createdb qsme
```
In `.env` set (use your Mac username if different):
```bash
DATABASE_URL=postgres://YOUR_MAC_USERNAME@127.0.0.1:5432/qsme
```
Example: `postgres://apple@127.0.0.1:5432/qsme`

**Set env vars:** copy `.env.example` to `.env` and set `DATABASE_URL` (and any others you need).

**Optional – PaddleOCR:** For better OCR on image-heavy pages (e.g. tables), install PaddleOCR and set `USE_PADDLE_OCR=true` in `.env`. `PADDLE_OCR_MODE=basic` (default) gives text + bbox; `PADDLE_OCR_MODE=structure` uses PP-StructureV3 for layout, tables, and formulas. If unset or Paddle fails, Tesseract is used.

**Run:**
```bash
cd backend
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0
```

API: http://localhost:8000 — Docs: http://localhost:8000/docs
 