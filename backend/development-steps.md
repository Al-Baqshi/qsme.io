# QSME Backend — Development Steps

## Latest (where you are / what’s done)

- **Page multi-select extraction:** Checkboxes on each page card; "Select all" / "Clear"; "Extract N" button to extract only selected pages. Extract one page, a range (select 1 and 2), or all.
- **Table display fix:** Tables now render correctly when backend sends string, string[], or string[][] — normalized for display in Tables tab, Document tab, Layout view, and Copy as Markdown.
- **PP-StructureV3 env:** `.env.example` documents `USE_PADDLE_OCR` and `PADDLE_OCR_MODE=structure` for proper table recognition. Without these, extraction uses PDF text only — image-based tables won't be detected.
- **Extract all UX:** Single-click "Extract all" (unextracted only); dropdown for "Re-extract all". "Extract all" link in Pages header.
- **Delete project:** Backend `DELETE /projects/{project_id}` deletes project and all document storage; frontend projects list and project detail have delete with confirmation (“Confirm you want to delete…”). After delete, project detail redirects to `/projects`.
- **Structured extraction:** Footer and list block types added. Blocks in the bottom ~15% of the page (from PDF dict bbox) are marked `type: "footer"`. Bulleted/numbered lines become `type: "list"` with `content: string[]`. Tables remain tables; footer can contain table or text.
- **Extraction panel:** New tabs **Tables**, **Lists**, **Footer** show only blocks of that type. Notes and OCR still show full structured content; text tab is raw page text.

**Next:** Set `USE_PADDLE_OCR=true` and `PADDLE_OCR_MODE=structure` in backend `.env`, then use "Re-extract all" to reprocess with PP-StructureV3 for image-based tables.

---

## What we currently have

### Clean architecture (refactored)
- **Domain** (`app/domain/`): entities, value_objects, contracts. No dependency on infrastructure. Single source of truth for overlay/quantity types.
- **Application** (`app/application/`): `quantity_engine.py` — pure domain logic for quantities.
- **Infrastructure** (`app/infrastructure/database/`): DB connection and ORM models. `app.database` and `app.models` re-export from here.
- **Schemas** (`app/schemas/`): Re-export from domain so existing code keeps working.
- See `docs/ARCHITECTURE.md` for the full layout and dependency rules.

### API
- **Health:** `GET /health`
- **Projects:** `POST /projects`, `GET /projects`, `GET /projects/{id}/context`
- **Documents:** `POST /projects/{project_id}/documents` (multipart: file or filename + storageUri) — runs extraction synchronously, returns document with `status: "processed"` when done
- **Pages:** `GET /documents/{document_id}/pages` (id, pageNumber, imageUrl, detectedPageType, textContent, structuredContent), `POST /pages/{page_id}/scale`
- **Overlays:** `GET/POST /pages/{page_id}/overlays`, `PATCH/DELETE /overlays/{overlay_id}`
- **Quantities:** `GET /projects/{project_id}/quantities`
- **Exports:** `POST /projects/{project_id}/export` (format: csv | xlsx | pdf)

### Services
- **Extraction:** PDF → store, split, render 300 DPI PNGs, text (PyMuPDF + Tesseract OCR fallback), page-type detection, AI-assist classification
- **Project knowledge hub:** Full project context (project, documents, pages, overlays, quantities, issues, exports) with `contextVersion` / `needsRecompute`
- **Quantity engine:** Deterministic quantities from rooms/openings/measurements (floor area, perimeter, skirting, wall areas)
- **Trade agents:** Finishes, skirting, electrical, plumbing, concrete — schedule rows with overlay traceability
- **Export engine:** CSV, XLSX, PDF from quantity snapshots
- **AI assist:** Page classification, room/symbol suggestions, issue hints (non-authoritative; not persisted)

### Data
- **DB:** PostgreSQL via SQLAlchemy — projects, documents, pages, overlays (+ room/opening/symbol/measurement/note), quantity_snapshots, export_jobs
- **Storage:** Local object storage via `OBJECT_STORAGE_DIR` / `OBJECT_STORAGE_PREFIX`; page images and original PDFs stored by document id

### Gaps (known)
- No auth; no user/scoping
- `imageUrl` on pages is a storage path (e.g. `object://qsme/...`), not an HTTP URL — no endpoint to serve page images
- No `GET /projects/{id}` (minimal project + counts); list uses full context or list only
- Issues are `list[str]`; frontend may want structured (id, type, severity, page, suggestedFix)
- Export returns `downloadUri` (storage path); no `GET /exports/{id}/download` to stream file

---

## Starting point (now)

Use this order to get to a testable “upload → content” flow and a clear path to production.

- [ ] **1. Document env and run requirements**  
  README or `.env.example`: PostgreSQL URL, `OBJECT_STORAGE_DIR`, `OBJECT_STORAGE_PREFIX`; note Tesseract required for OCR fallback.

- [x] **2. Upload happy-path (UI)**  
  Frontend: "Upload PDF" button in project header and in left sidebar (and mobile menu). Create project → open project → click "Upload PDF" or drop in sidebar → `POST /projects/{id}/documents` with PDF; refetch context. Backend already accepts multipart `file` and runs extraction synchronously.
- [ ] **2b. Upload happy-path test (optional)**  
  Script or pytest: create project → `POST /projects/{id}/documents` with a PDF → assert 200, `status === "processed"`, document has `id` and `projectId`.

- [ ] **3. Pages-with-content test**  
  After upload: `GET /documents/{document_id}/pages` → assert page count, each page has `pageNumber`, `textContent`, `detectedPageType`.

- [ ] **4. Serve page images over HTTP**  
  New endpoint: `GET /pages/{page_id}/image` (or `GET /documents/{document_id}/pages/{page_number}/image`) that streams the PNG from object storage. Document that “open in separate pages” = this URL + pages list for text/type.

- [ ] **5. Optional: AI analysis endpoint**  
  e.g. `GET /documents/{document_id}/pages/{page_id}/analysis` returning AIAssistResult (classification, suggestions, issues) for “AI read” without persisting suggestions.

- [ ] **6. Dev steps doc**  
  Keep this file updated as steps are done and new steps are added.

### Database (Sevala / Postgres)
- Set **DATABASE_URL** to your Postgres URL. You can use `postgres://...` (e.g. Sevala); the app normalizes it to `postgresql+psycopg://` for SQLAlchemy.
- **First run**: Tables are created automatically on startup via `Base.metadata.create_all(bind=engine)`. No separate migration command.
- **Existing DB (added structured extraction):** If the `pages` table already exists, add the new column:  
  `ALTER TABLE pages ADD COLUMN IF NOT EXISTS structured_content JSONB DEFAULT '[]';`
- Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` there.
- **Run backend from laptop:** see **`backend/RUNNING.md`** (port-forward Postgres, use `DATABASE_URL` with `127.0.0.1`, then start uvicorn).

#### Why the DB might not connect
- Your Sevala Postgres URL uses an **in-cluster hostname**:  
  `xenial-lime-goldfish-cymsf-postgresql.xenial-lime-goldfish-cymsf.svc.cluster.local`  
  That name **only resolves inside the same Kubernetes cluster**. If you run the backend on your laptop (or anywhere outside that cluster), the hostname does not resolve, so the DB connection fails.
- **To get connected** you have two options:

**Option A — Run the backend inside the cluster (recommended for staging/prod)**  
Deploy the backend to the same cluster (e.g. Sevala) where Postgres runs. Then the in-cluster hostname resolves and the app connects using `DATABASE_URL` from your deployment env (or `.env` baked into the image / mounted).

**Option B — Run the backend locally and tunnel to Postgres**  
1. From your machine, port-forward the Postgres service (if you have `kubectl` and access to the cluster):
   ```bash
   kubectl port-forward svc/xenial-lime-goldfish-cymsf-postgresql 5432:5432 -n xenial-lime-goldfish-cymsf
   ```
   (Adjust service name and namespace to match your cluster.)
2. In `backend/.env` use **localhost** for local runs:
   ```bash
   DATABASE_URL=postgres://imperial-gold-galliform:YOUR_PASSWORD@127.0.0.1:5432/qsme-lime-py-qsme
   ```
3. Run the backend from the **backend** directory so it loads `backend/.env`:
   ```bash
   cd backend
   PYTHONPATH=backend uvicorn app.main:app --reload
   ```
   Or with venv: `cd backend && .venv/bin/uvicorn app.main:app --reload` (ensure you're in `backend` so `app.main` finds `backend/.env` via the path in `main.py`).

#### Do you need to run with backend?
Yes. Run the app from the **backend** directory (or set `PYTHONPATH` to the backend directory). The app loads `backend/.env` from `app/main.py` using the path relative to the app package, so when uvicorn runs `app.main:app`, it loads `backend/.env` and `DATABASE_URL` is set. If you run uvicorn from the repo root without `PYTHONPATH=backend`, the app may not find the right `.env` or the `app` package.

**Commands to run the backend (from repo root or backend):**
```bash
cd backend
pip install -r requirements.txt   # or use venv
PYTHONPATH=backend uvicorn app.main:app --reload --host 0.0.0.0
```
Or with a venv:
```bash
cd backend
.venv/bin/pip install -r requirements.txt
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0
```
With this, `backend/.env` is loaded and the DB connection uses `DATABASE_URL`. For **in-cluster** Postgres, run this **inside the cluster** (e.g. deploy to Sevala). For **local** runs with the same DB, use Option B (port-forward + `DATABASE_URL` with `@127.0.0.1:5432/...`).

---

## Later (production-ready)

- [ ] **Async extraction**  
  Upload returns 202 + document id; extraction runs in worker; `GET /documents/{id}` or context includes `status`; clients poll or use webhook until `processed` / `error`.

- [ ] **Auth and tenancy**  
  API keys or JWT; scope projects/documents by tenant/user so platforms can plug in their own identity.

- [ ] **Lightweight project summary**  
  `GET /projects/{id}`: id, name, description, createdAt, derived status, document count, page count, last activity (no full context).

- [ ] **Structured issues**  
  Issues as list of `{ id, type, title, description, severity, page?, suggestedFix? }` in context and in quantity response.

- [ ] **Export download endpoint**  
  `GET /exports/{job_id}/download` (or `/projects/{id}/exports/{job_id}/file`) streams the generated file so clients don’t need direct storage access.

- [ ] **Project metadata**  
  Optional fields on project: client, location, status, settings (e.g. JSONB `meta`) for API and context.

- [ ] **Pagination and limits**  
  List projects/documents with limit/offset or cursor; cap page size for list endpoints.

- [ ] **Rate limiting and timeouts**  
  Protect upload and heavy endpoints; timeouts for extraction and external calls.

- [ ] **Observability**  
  Request IDs, structured logging, metrics (e.g. OpenTelemetry), health checks for DB and storage.

- [ ] **Config and secrets**  
  All config via env or secret store; no hardcoded credentials; separate dev/staging/prod.

- [ ] **CI and tests**  
  Unit tests for services; integration tests for upload → pages → quantities → export; run on every PR.
