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
