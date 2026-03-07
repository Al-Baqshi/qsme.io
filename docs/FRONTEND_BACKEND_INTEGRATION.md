# Frontend–Backend Integration: Analysis & Recommendations

## Current state

### Frontend (static, mock-only)
- **Data source:** All project data comes from `lib/qsme-mock-data.ts` (`MOCK_PROJECTS`, `getProject(id)`, `MOCK_ISSUES`).
- **No API client:** No `fetch`/axios calls, no `NEXT_PUBLIC_*` env for API base URL.
- **Screens using mocks:**
  - `app/projects/page.tsx` — list: `MOCK_PROJECTS` (filter by search + status).
  - `app/projects/[id]/page.tsx` — workspace: `getProject(id)`, `MOCK_ISSUES`.
  - `app/projects/[id]/summary/page.tsx` — QS summary: `getProject(id)`.

### Backend (FastAPI)
- **DB:** PostgreSQL via SQLAlchemy; tables: `projects`, `documents`, `pages`, `overlays`, room/opening/symbol/measurement/note, `quantity_snapshots`, `export_jobs`.
- **Routers:**

| Area        | Endpoint | Method | Purpose |
|------------|----------|--------|---------|
| Projects   | `/projects` | POST | Create project |
|            | `/projects` | GET | List projects |
|            | `/projects/{id}/context` | GET | Full project context (project, documents, pages, overlays, quantities, issues, exports) |
| Documents  | `/projects/{project_id}/documents` | POST | Upload PDF (file or filename + storageUri); triggers extraction |
| Pages      | `/documents/{document_id}/pages` | GET | List pages of a document |
|            | `/pages/{page_id}/scale` | POST | Set scale (title_block or calibration) |
| Overlays   | `/pages/{page_id}/overlays` | GET | List overlays for page |
|            | `/pages/{page_id}/overlays` | POST | Create overlay |
|            | `/overlays/{overlay_id}` | PATCH | Update overlay |
|            | `/overlays/{overlay_id}` | DELETE | Delete overlay |
| Quantities | `/projects/{project_id}/quantities` | GET | Get/compute project quantities (rooms, scheduleRows, issues) |
| Exports    | `/projects/{project_id}/export` | POST | Export quantities (csv/xlsx/pdf); returns job with `downloadUri` |

---

## Data shape gaps (frontend vs backend)

| Frontend (QSProject / QSPage / etc.) | Backend (Project / ProjectContext / Overlay) | Notes |
|--------------------------------------|-----------------------------------------------|--------|
| `client`, `location`, `status`, `updatedAt`, `settings`, `summary` | Project has only `id`, `name`, `description`, `createdAt` | Backend project is minimal. Status can be derived from context (e.g. no docs = draft; any doc processing = processing; else ready). Client/location/settings/summary can be (a) added to backend Project, or (b) kept in frontend only / localStorage until you add them to API. |
| `QSFile`: `name`, `status`, `pages[]` | Document: `filename`, `status`; pages from context | Map document → file; pages in context are per-document, need grouping by document. |
| `QSPage`: `name`, `imageUrl`, `tags`, `status`, `rooms`, `dimensions`, `notes`, `annotations`, `scale`, `confidence` | Page: `pageNumber`, `imageUrl`, `detectedPageType`, `textContent`, `pageScale`; overlays per page (room/measurement/note/…) | Backend has overlays as separate list; frontend expects rooms/dimensions/notes/annotations on page. Need **adapter**: group overlays by page, map overlay kinds → rooms/dimensions/notes; page “name” can be “Page {pageNumber}” or from doc; tags from `detectedPageType` or page_type. |
| `QSRoom` (area, perimeter, level, confidence, verified) | Overlay kind `room` with polygon, name, roomType, level, cachedAreaM2, cachedPerimeterM, confidence, verified | Map overlay payload + overlay.verified, overlay.confidence → QSRoom. |
| `QSDimension` (label, value, units, type, startPoint, endPoint) | Overlay kind `measurement` (start, end, valueM, displayUnits, label, method) | Map measurement overlay → QSDimension; type can come from meta or default. |
| `QSNote` (text, category, position) | Overlay kind `note` (position, text, category) | Direct map. |
| `QSAnnotation` (type, position, size, label) | Overlay kind `symbol` (position, sizeNorm, symbolType, label) or custom annotation type if you add it | Backend has symbols; frontend “annotations” are mixed circle/triangle/line — map symbols to annotations where possible. |
| `QSSummary` (totals, room counts, MEP counts, etc.) | `ProjectContext.quantities` (rooms, scheduleRows, issues) | Summary can be **computed from** `GET /projects/{id}/quantities` (rooms + scheduleRows) or from context.quantities when present. |
| `QSIssue` (id, type, title, description, severity, page, suggestedFix) | `ProjectContext.issues` is `list[str]` | Backend only returns list of strings; frontend expects structured issues. Either derive QSIssue from strings (e.g. parse or use as description) or extend backend to return structured issues. |

---

## Recommended direction

### 1. API client and env
- Add **base URL** for the backend, e.g. `NEXT_PUBLIC_QSME_API_URL` (default `http://localhost:8000`).
- Add a small **API client** in `lib/api/` (or `lib/qsme-api.ts`):
  - `getProjects()`, `createProject(payload)`
  - `getProjectContext(projectId)` → raw context
  - `getDocumentPages(documentId)`
  - `uploadDocument(projectId, file)`
  - `getPageOverlays(pageId)`, `createOverlay(pageId, payload)`, `updateOverlay(overlayId, patch)`, `deleteOverlay(overlayId)`
  - `setPageScale(pageId, payload)`
  - `getProjectQuantities(projectId)`
  - `exportProject(projectId, format)`
- Use `fetch` with `NEXT_PUBLIC_QSME_API_URL`; handle 4xx/5xx and network errors; return typed responses (align with backend schemas or with adapter output).

### 2. Adapter layer (context → UI model)
- Add **`lib/adapters/context-to-project.ts`** (or similar) that:
  - Takes `ProjectContext` (and optionally `ProjectQuantitiesResponse`).
  - Returns a **QSProject-like** object: project meta (id, name, description; derive or default `client`, `location`, `status`), `files` (from context.documents + context.pages grouped by documentId), each file with `pages` where each page has:
    - `id`, `number`, `name`, `imageUrl`, `tags`, `status` (from document/page status),
    - `rooms`, `dimensions`, `notes`, `annotations` built from context.overlays filtered by pageId and kind,
    - `scale` from page.pageScale, `confidence` from overlays or default.
  - Builds **QSSummary** from context.quantities (rooms + scheduleRows) when present; otherwise minimal defaults.
- Optionally a second adapter **overlays → issues**: map `context.issues` (string[]) to `QSIssue[]` (e.g. one issue per string with a generated id and severity).

This keeps UI components and types (`QSProject`, `QSPage`, etc.) unchanged; only the data source switches from mock to API + adapter.

### 3. Where to call which endpoint

| Screen | Current | Recommended |
|--------|---------|-------------|
| **Projects list** | `MOCK_PROJECTS` | `GET /projects` → list. Optionally for each project (or on demand) call `GET /projects/{id}/context` to show file count, page count, status; or add a lightweight `GET /projects/{id}` that returns summary counts + status if you add it. |
| **Project workspace** (`/projects/[id]`) | `getProject(id)` | `GET /projects/{id}/context` → adapter → single “project” object. Use it for left sidebar (files, pages), page navigator, drawing viewer, extraction panel. When user uploads PDF: `POST /projects/{id}/documents` with file; then refetch context (or refetch documents/pages). When user clicks “Run Extraction”: same upload or trigger extraction if backend supports it; then refetch context. Save/Export buttons: Save = PATCH overlays for changed overlays; Export = `POST /projects/{id}/export` then show link or poll for download. |
| **QS Summary** (`/projects/[id]/summary`) | `getProject(id)` | Prefer `GET /projects/{id}/quantities` to get rooms + scheduleRows + issues; optionally also `GET /projects/{id}/context` for project/doc/page meta. Adapter builds QSSummary + room/dimension tables from quantities and context. Export CSV/PDF: `POST /projects/{id}/export` with format, then use returned `downloadUri` (see below). |

### 4. Backend enhancements (optional but useful)

- **GET /projects/{id}**  
  Return minimal project (id, name, description, createdAt) and optionally derived status and counts (document count, total pages, last activity). Lets the list page show status without loading full context for every row.

- **Structured issues**  
  If you want the UI to show title, severity, page, suggestedFix: extend `ProjectContext.issues` or quantity response to a list of `{ id, type, title, description, severity, page?, suggestedFix? }` instead of `list[str]`.

- **Export download endpoint**  
  `POST /projects/{id}/export` returns `downloadUri` (e.g. object-store path). Add **GET /exports/{job_id}/download** (or `/projects/{id}/exports/{job_id}/file`) that streams the file so the frontend can do “Export → download” without handling object-store URLs.

- **Project metadata**  
  If you need `client`, `location`, `status`, `settings` in the API: add columns or a JSONB `meta` on `projects` and expose in GET project and in context.

### 5. Implementation order

1. **Env + API client**  
   - `NEXT_PUBLIC_QSME_API_URL`  
   - `lib/qsme-api.ts` with all endpoints above and basic error handling.

2. **Adapter**  
   - `context-to-project.ts`: ProjectContext (+ quantities) → QSProject-like (files, pages, rooms, dimensions, notes, annotations, summary).  
   - Optional: raw issues → QSIssue[].

3. **Projects list**  
   - Replace `MOCK_PROJECTS` with `getProjects()`; optionally use context or new GET project for status/counts.

4. **Project workspace**  
   - Load: `getProjectContext(id)` → adapter → set as project state.  
   - Upload: `uploadDocument(projectId, file)` then refetch context.  
   - Overlays: load from context; edits call create/update/delete overlay then refetch or optimistic update.  
   - Scale: `setPageScale(pageId, payload)` then refetch.  
   - Export: `exportProject(projectId, format)` then show link or use download endpoint when added.

5. **QS Summary**  
   - Load: `getProjectQuantities(id)` (+ context if needed) → adapter → summary + tables.  
   - Export: same as workspace.

6. **Polish**  
   - Loading/error states, retries, optional polling for extraction status, download from export job when backend supports it.

---

## Endpoint summary (for the API client)

```text
GET  /projects
POST /projects
GET  /projects/{id}/context
GET  /projects/{id}/quantities
POST /projects/{id}/documents          (multipart: file + optional filename)
GET  /documents/{document_id}/pages
POST /pages/{page_id}/scale
GET  /pages/{page_id}/overlays
POST /pages/{page_id}/overlays
PATCH /overlays/{overlay_id}
DELETE /overlays/{overlay_id}
POST /projects/{project_id}/export     (body: { format: "csv"|"xlsx"|"pdf" })
```

---

## Implemented (frontend redesign)

- **Env:** `NEXT_PUBLIC_QSME_API_URL` (default `http://localhost:8000`), `NEXT_PUBLIC_USE_MOCK_DATA` (set to `true` to use mock data; `false` or unset to use API). See `.env.example`.
- **API client:** `lib/qsme-api.ts` — `getProjects`, `createProject`, `getProjectContext`, `getProjectQuantities`, `uploadDocument`, `getDocumentPages`, `setPageScale`, `getPageOverlays`, `createOverlay`, `updateOverlay`, `deleteOverlay`, `exportProject`. Types in `lib/qsme-api-types.ts`.
- **Adapter:** `lib/adapters/context-to-project.ts` — `contextToProject(context, quantities?)` → `QSProject`; `issuesToQSIssues(issues)` → `QSIssue[]`.
- **Projects list** (`app/projects/page.tsx`): When `USE_MOCK_DATA` is false, fetches `GET /projects`, shows loading/error, "New Project" calls `createProject` and redirects to the new project. When true, uses `MOCK_PROJECTS` as before.
- **Project workspace** (`app/projects/[id]/page.tsx`): When `USE_MOCK_DATA` is false, fetches `getProjectContext(id)` and optionally `getProjectQuantities(id)`, builds project via `contextToProject`; issues from `issuesToQSIssues(context.issues)`. Upload zone calls `uploadDocument(projectId, file)` then refetches context. Export button/dropdown call `exportProject(projectId, format)`. Loading/error and dismissible error banner.
- **QS Summary** (`app/projects/[id]/summary/page.tsx`): When `USE_MOCK_DATA` is false, fetches context + quantities, builds project via `contextToProject`; Export CSV/PDF call `exportProject(id, format)`.

After the adapter and these calls are in place, the frontend will be driven by the real backend; you can remove or gate mock data behind a flag (e.g. `USE_MOCK_DATA`) for local dev without the backend.
