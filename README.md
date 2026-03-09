# Circle Tool

A circle geometry editor with an AI agent built in. Draw circles, add chords, compute measurements, and control everything with natural language via Claude.

## What's in the box

| Feature | Description |
|---|---|
| **Canvas Renderer** | HTML5 Canvas with HiDPI support, dot grid, circle/chord drawing, labeled measurements. Redraws on resize via ResizeObserver. |
| **Geometry Engine** | Live computation of circumference, area, sagitta, central angle, arc length, sector area, and segment area. |
| **AI Chatbot** | Claude Opus 4.5 via Vercel AI Gateway. Natural language control of the canvas. |
| **Tool Calling** | Four client-side tools (`setCircle`, `setLine`, `removeCircle`, `removeLine`) via AI SDK 6. |
| **Model Picker** | Switch between Opus 4.5 (best), Sonnet 4 (mid), and Haiku 3.5 (cheap). |
| **Chord Sliders** | Real-time length and angle adjustment. Values sync between inputs, sliders, and AI commands. |
| **Export Image** | JPG with quality/background options, PNG with transparency. 1x-4x scale. Toggle grid and labels. |
| **Copy Data** | JSON and CSV output with preview modal. One-click clipboard copy. |
| **Responsive Layout** | Chat sidebar slides left without squeezing the canvas. Right sidebar stacks on mobile. |
| **Design Tokens** | Full light/dark theme via CSS custom properties. |

## Routes

| Path | Description |
|---|---|
| `/` | Homepage / docs — feature ticker, thumbnail carousel, feature cards, tech stack |
| `/tool` | The interactive circle editor with AI chatbot sidebar |
| `/brand-assets` | Thumbnails, OG images, favicons, and touch icons |
| `/thumbnail?v=a` | Full-size thumbnail variants (a, b, c, d) for screenshotting |

## Tech stack

- Next.js 16
- React 19
- Tailwind CSS
- shadcn/ui
- AI SDK 6
- Vercel AI Gateway (Claude Opus 4.5 default)
- Lucide Icons
- Zod
- TypeScript

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The homepage shows what's included. Click "Open the tool" to go to the editor at `/tool`.

## Project structure

```
app/
  page.tsx              # Homepage / docs
  tool/page.tsx         # Circle editor with AI chatbot
  brand-assets/page.tsx # Brand asset gallery
  thumbnail/page.tsx    # Full-size thumbnail renderer
  api/chat/route.ts     # AI chat streaming endpoint
components/
  home/                 # Homepage components (ticker, carousel)
  brand/                # Brand asset components (thumbnail)
  circle-canvas.tsx     # Canvas renderer
  geometry-data.tsx     # Geometry data display
  chat-panel.tsx        # AI chatbot panel with model picker
  export-modal.tsx      # Export image modal
lib/
  geometry.ts           # Geometry computation + JSON/CSV export
  draw-circle.ts        # Canvas drawing logic
  chat-tools.ts         # AI SDK tool definitions
```
# qsme.io

## QSME domain contracts

The repository now includes a dedicated QSME domain contract file at `lib/qsme-domain-types.ts` that mirrors the planned backend models for:

- normalized geometry overlays (rooms, openings, symbols, measurements, notes)
- page scale calibration and evidence anchors
- quantity outputs, schedule rows, trade scopes, and rules profiles

Use these interfaces when wiring API responses and autosave payloads so the workspace UI, extraction pipeline, and quantity engine all share one shape.

## QSME FastAPI backend

A backend scaffold now lives under `backend/` and follows the requested clean architecture:

- `app/routers`: projects, documents, pages, overlays, quantities, exports
- `app/services`: overlay, extraction, quantity services
- `app/models`: SQLAlchemy PostgreSQL models
- `app/schemas`: Pydantic domain schemas aligned to `lib/qsme-domain-types.ts`
- `app/workers`: extraction worker entrypoint

Run locally (after installing Python deps):

**Option A — Backend with Docker Postgres (same DB every time)**

```bash
# From repo root: start Postgres and run the backend in one go
yarn backend
# Or: bash backend/scripts/run-with-db.sh
```

This starts Postgres in Docker (creates the `qsme` database on first run, keeps data in volume `qsme_pgdata`), waits for it to be ready, then starts uvicorn. No need to run `createdb qsme` manually.

**Option B — Backend only (you run Postgres yourself)**

```bash
# Ensure Postgres is running with a database named qsme, then:
cd backend && PYTHONPATH=. python -m uvicorn app.main:app --reload
# Or set DATABASE_URL and run uvicorn from backend.
```

To start only the database (e.g. for running the backend in another terminal):

```bash
yarn db:up    # docker compose up -d db
yarn db:down   # stop and remove containers (data in volume persists)
```

### Quantity engine

The deterministic quantity engine is implemented in `backend/app/services/quantity_engine.py`.
It computes floor area (shoelace), perimeter (scaled edges), skirting (perimeter - door widths), wall gross/net areas, and aggregated totals by level/project from room/opening/measurement overlays.

### PDF extraction pipeline

`backend/app/services/extraction_service.py` now implements a deterministic PDF extraction workflow using PyMuPDF, Pillow, and pytesseract:
- store original uploaded PDF in object storage
- split PDF into pages
- render each page to PNG at 300 DPI
- extract embedded text via PyMuPDF
- run OCR fallback via Tesseract when embedded text is empty
- classify page type (`floor_plan`, `elevation`, `section`, `site_plan`, `notes`, `schedule`)

### Page scale calibration

`POST /pages/{page_id}/scale` supports two calibration methods and stores per-page scale:
- `method: "title_block"` parses text like `1:100` and computes `metersPerNormX/Y` from the rendered 300 DPI page image.
- `method: "calibration"` uses two normalized points + real length (meters) to compute `metersPerNormX/Y`.

### Trade agent framework

`backend/app/services/trade_agents.py` provides trade-specific agents and a `BossAgent` orchestrator:
- `FinishesAgent`
- `SkirtingAgent`
- `ElectricalAgent`
- `PlumbingAgent`
- `ConcreteAgent`

Each agent reads overlays + base quantities from a project knowledge hub and returns `QuantityScheduleRow` outputs with overlay traceability and confidence scores. `BossAgent` merges all agent rows into a final `ProjectQuantitiesResponse`.

### Project Knowledge Hub

`backend/app/services/project_knowledge_hub.py` provides `get_project_context(project_id)` to return versioned project context for agent queries without reprocessing PDFs:
- `project`
- `documents`
- `pages`
- `overlays`
- `quantities`
- `issues`
- `exports`

The hub computes `contextVersion` and `needsRecompute` so quantities can be reused or recomputed when overlays change.

### AI assistance layer

`backend/app/services/ai_assist_service.py` adds assistive (non-authoritative) AI suggestions for:
- page classification
- room label detection
- symbol recognition suggestions
- issue detection

AI outputs include confidence and suggested overlays flagged as `accepted=false` so users can accept/reject before persistence. The AI layer does **not** compute quantities.

### Export engine

`POST /projects/{project_id}/export` now supports:
- `csv`
- `xlsx`
- `pdf`

`backend/app/services/export_engine.py` generates exports containing room schedule, skirting schedule, electrical schedule, and project totals using `pandas`, `openpyxl`, and `reportlab`.
