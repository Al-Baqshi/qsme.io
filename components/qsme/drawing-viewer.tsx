"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import type { QSPage, QSAnnotation, QSDimension } from "@/lib/qsme-types"

interface DrawingViewerProps {
  page: QSPage | null
  zoom: number
  activeTool: string
  selectedAnnotationId: string | null
  selectedDimensionId: string | null
  onAnnotationClick: (id: string) => void
}

export function DrawingViewer({
  page,
  zoom,
  activeTool,
  selectedAnnotationId,
  selectedDimensionId,
  onAnnotationClick,
}: DrawingViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height

    // background
    ctx.fillStyle = "hsl(0 0% 97%)"
    ctx.fillRect(0, 0, w, h)

    // grid
    ctx.strokeStyle = "hsl(0 0% 90%)"
    ctx.lineWidth = 0.5
    const gridSize = 20 * zoom
    const offsetX = pan.x % gridSize
    const offsetY = pan.y % gridSize
    for (let x = offsetX; x < w; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    if (!page) {
      ctx.fillStyle = "hsl(0 0% 55%)"
      ctx.font = "14px system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Select a page to view the drawing", w / 2, h / 2)
      return
    }

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // draw floor plan representation
    drawFloorPlan(ctx, page, w / zoom, h / zoom)

    // draw dimensions
    page.dimensions.forEach((dim) => {
      const isSelected = dim.id === selectedDimensionId
      drawDimension(ctx, dim, isSelected)
    })

    // draw annotations
    page.annotations.forEach((ann) => {
      const isSelected = ann.id === selectedAnnotationId
      drawAnnotation(ctx, ann, isSelected)
    })

    // draw rooms overlay
    drawRoomOverlays(ctx, page, w / zoom, h / zoom)

    ctx.restore()

    // page info
    ctx.fillStyle = "hsl(0 0% 45%)"
    ctx.font = "11px system-ui, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText(`Page ${page.number}: ${page.name}`, 12, h - 12)
    ctx.textAlign = "right"
    if (page.scale) ctx.fillText(`Scale: ${page.scale}`, w - 12, h - 12)
    ctx.fillText(`${Math.round(zoom * 100)}%`, w - 12, h - 28)
  }, [page, zoom, pan, selectedAnnotationId, selectedDimensionId])

  useEffect(() => {
    paint()
  }, [paint])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => paint())
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [paint])

  function handleMouseDown(e: React.MouseEvent) {
    if (activeTool === "pan" || e.button === 1) {
      setIsPanning(true)
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      })
    }
  }

  function handleMouseUp() {
    setIsPanning(false)
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-md"
        style={{ cursor: isPanning ? "grabbing" : activeTool === "pan" ? "grab" : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
}

// ── Drawing helpers ──

function drawFloorPlan(
  ctx: CanvasRenderingContext2D,
  page: QSPage,
  w: number,
  h: number
) {
  const cx = w / 2
  const cy = h / 2
  const scale = Math.min(w, h) * 0.35

  if (page.tags.includes("Floor Plan")) {
    // exterior walls
    ctx.strokeStyle = "hsl(0 0% 20%)"
    ctx.lineWidth = 3
    ctx.strokeRect(cx - scale, cy - scale * 0.7, scale * 2, scale * 1.4)

    // interior walls
    ctx.lineWidth = 1.5
    ctx.strokeStyle = "hsl(0 0% 35%)"

    // horizontal divider
    ctx.beginPath()
    ctx.moveTo(cx - scale, cy)
    ctx.lineTo(cx + scale * 0.3, cy)
    ctx.stroke()

    // vertical divider
    ctx.beginPath()
    ctx.moveTo(cx + scale * 0.3, cy - scale * 0.7)
    ctx.lineTo(cx + scale * 0.3, cy + scale * 0.7)
    ctx.stroke()

    // another room divider
    ctx.beginPath()
    ctx.moveTo(cx - scale * 0.3, cy)
    ctx.lineTo(cx - scale * 0.3, cy + scale * 0.7)
    ctx.stroke()

    // door arcs
    ctx.strokeStyle = "hsl(210 80% 55%)"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])

    // front door
    ctx.beginPath()
    ctx.arc(cx - scale * 0.1, cy + scale * 0.7, scale * 0.15, Math.PI, Math.PI * 1.5)
    ctx.stroke()

    // internal door
    ctx.beginPath()
    ctx.arc(cx + scale * 0.3, cy - scale * 0.15, scale * 0.12, Math.PI * 0.5, Math.PI)
    ctx.stroke()

    ctx.setLineDash([])

    // windows
    ctx.strokeStyle = "hsl(210 80% 60%)"
    ctx.lineWidth = 2
    const drawWindow = (x: number, y: number, w2: number, vertical: boolean) => {
      if (vertical) {
        ctx.strokeRect(x - 2, y, 4, w2)
      } else {
        ctx.strokeRect(x, y - 2, w2, 4)
      }
    }
    drawWindow(cx - scale * 0.6, cy - scale * 0.7, scale * 0.3, false)
    drawWindow(cx + scale * 0.6, cy - scale * 0.7, scale * 0.3, false)
    drawWindow(cx + scale, cy - scale * 0.3, scale * 0.3, true)
  } else if (page.tags.includes("Section")) {
    // section drawing
    ctx.strokeStyle = "hsl(0 0% 25%)"
    ctx.lineWidth = 2

    // ground
    ctx.beginPath()
    ctx.moveTo(cx - scale, cy + scale * 0.5)
    ctx.lineTo(cx + scale, cy + scale * 0.5)
    ctx.stroke()

    // walls
    ctx.strokeRect(cx - scale * 0.8, cy - scale * 0.6, scale * 1.6, scale * 1.1)

    // floors
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx - scale * 0.8, cy - scale * 0.05)
    ctx.lineTo(cx + scale * 0.8, cy - scale * 0.05)
    ctx.stroke()

    // roof
    ctx.beginPath()
    ctx.moveTo(cx - scale * 0.9, cy - scale * 0.6)
    ctx.lineTo(cx, cy - scale)
    ctx.lineTo(cx + scale * 0.9, cy - scale * 0.6)
    ctx.closePath()
    ctx.stroke()
  } else if (page.tags.includes("Electrical")) {
    // electrical layout - show symbol positions
    ctx.strokeStyle = "hsl(0 0% 30%)"
    ctx.lineWidth = 2
    ctx.strokeRect(cx - scale, cy - scale * 0.7, scale * 2, scale * 1.4)

    // socket symbols
    const symbols = [
      { x: cx - scale * 0.7, y: cy - scale * 0.4, type: "socket" },
      { x: cx - scale * 0.3, y: cy - scale * 0.4, type: "socket" },
      { x: cx + scale * 0.2, y: cy - scale * 0.4, type: "socket" },
      { x: cx + scale * 0.7, y: cy - scale * 0.4, type: "socket" },
      { x: cx - scale * 0.5, y: cy + scale * 0.3, type: "socket" },
      { x: cx + scale * 0.5, y: cy + scale * 0.3, type: "socket" },
      { x: cx - scale * 0.5, y: cy - scale * 0.1, type: "light" },
      { x: cx + scale * 0.1, y: cy - scale * 0.1, type: "light" },
      { x: cx + scale * 0.6, y: cy + scale * 0.1, type: "light" },
    ]

    symbols.forEach((s) => {
      if (s.type === "socket") {
        ctx.strokeStyle = "hsl(350 75% 50%)"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(s.x, s.y, 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(s.x - 4, s.y)
        ctx.lineTo(s.x + 4, s.y)
        ctx.stroke()
      } else {
        ctx.strokeStyle = "hsl(45 85% 50%)"
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(s.x, s.y - 6)
        ctx.lineTo(s.x - 5, s.y + 4)
        ctx.lineTo(s.x + 5, s.y + 4)
        ctx.closePath()
        ctx.stroke()
      }
    })

    // wiring runs
    ctx.strokeStyle = "hsl(350 75% 50%)"
    ctx.lineWidth = 0.8
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(cx - scale * 0.7, cy - scale * 0.4)
    ctx.lineTo(cx - scale * 0.3, cy - scale * 0.4)
    ctx.lineTo(cx + scale * 0.2, cy - scale * 0.4)
    ctx.lineTo(cx + scale * 0.7, cy - scale * 0.4)
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    // generic notes page
    ctx.fillStyle = "hsl(0 0% 50%)"
    ctx.font = "12px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(`${page.name}`, cx, cy - 20)
    ctx.font = "11px system-ui, sans-serif"
    ctx.fillText(`${page.notes.length} notes extracted`, cx, cy + 5)
  }
}

function drawRoomOverlays(
  ctx: CanvasRenderingContext2D,
  page: QSPage,
  w: number,
  h: number
) {
  if (!page.tags.includes("Floor Plan") || page.rooms.length === 0) return

  const cx = w / 2
  const cy = h / 2
  const scale = Math.min(w, h) * 0.35

  // map rooms to approximate positions
  const roomPositions: { room: typeof page.rooms[0]; x: number; y: number; w: number; h: number }[] = [
    { room: page.rooms[0], x: cx - scale * 0.95, y: cy + scale * 0.05, w: scale * 0.6, h: scale * 0.6 },
    { room: page.rooms[1], x: cx - scale * 0.95, y: cy - scale * 0.65, w: scale * 1.2, h: scale * 0.65 },
    { room: page.rooms[2], x: cx + scale * 0.35, y: cy - scale * 0.65, w: scale * 0.6, h: scale * 0.65 },
  ]

  if (page.rooms.length > 3) {
    roomPositions.push({ room: page.rooms[3], x: cx + scale * 0.35, y: cy + scale * 0.05, w: scale * 0.6, h: scale * 0.3 })
  }
  if (page.rooms.length > 4) {
    roomPositions.push({ room: page.rooms[4], x: cx + scale * 0.35, y: cy + scale * 0.4, w: scale * 0.6, h: scale * 0.25 })
  }
  if (page.rooms.length > 5) {
    roomPositions.push({ room: page.rooms[5], x: cx - scale * 0.3, y: cy + scale * 0.05, w: scale * 0.6, h: scale * 0.6 })
  }

  roomPositions.forEach(({ room, x, y, w: rw, h: rh }) => {
    // fill
    ctx.fillStyle = "hsla(210, 80%, 55%, 0.06)"
    ctx.fillRect(x, y, rw, rh)

    // border
    ctx.strokeStyle = "hsla(210, 80%, 55%, 0.3)"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.strokeRect(x, y, rw, rh)
    ctx.setLineDash([])

    // label
    ctx.fillStyle = "hsl(210, 80%, 40%)"
    ctx.font = "bold 9px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(room.name, x + rw / 2, y + rh / 2 - 4)
    ctx.font = "8px system-ui, sans-serif"
    ctx.fillStyle = "hsl(210, 80%, 50%)"
    ctx.fillText(`${room.area} m²`, x + rw / 2, y + rh / 2 + 8)
  })
}

function drawDimension(
  ctx: CanvasRenderingContext2D,
  dim: QSDimension,
  isSelected: boolean
) {
  const { startPoint: sp, endPoint: ep } = dim

  ctx.strokeStyle = isSelected ? "hsl(350 75% 55%)" : "hsl(170 70% 45%)"
  ctx.lineWidth = isSelected ? 2 : 1
  ctx.fillStyle = ctx.strokeStyle

  // line
  ctx.beginPath()
  ctx.moveTo(sp.x, sp.y)
  ctx.lineTo(ep.x, ep.y)
  ctx.stroke()

  // end ticks
  const angle = Math.atan2(ep.y - sp.y, ep.x - sp.x)
  const tickLen = 6
  const perpAngle = angle + Math.PI / 2

  ;[sp, ep].forEach((pt) => {
    ctx.beginPath()
    ctx.moveTo(
      pt.x + Math.cos(perpAngle) * tickLen,
      pt.y + Math.sin(perpAngle) * tickLen
    )
    ctx.lineTo(
      pt.x - Math.cos(perpAngle) * tickLen,
      pt.y - Math.sin(perpAngle) * tickLen
    )
    ctx.stroke()
  })

  // label
  const mx = (sp.x + ep.x) / 2
  const my = (sp.y + ep.y) / 2
  ctx.font = `${isSelected ? "bold " : ""}9px monospace`
  ctx.textAlign = "center"
  ctx.fillText(`${dim.value} ${dim.units}`, mx, my - 6)
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: QSAnnotation,
  isSelected: boolean
) {
  const { position: pos, size, type } = ann
  const color = isSelected ? "hsl(350 75% 55%)" : type === "circle" ? "hsl(210 80% 55%)" : type === "triangle" ? "hsl(45 85% 50%)" : "hsl(280 60% 55%)"

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = isSelected ? 2 : 1.5

  if (type === "circle") {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, size.width / 2, 0, Math.PI * 2)
    ctx.stroke()
  } else if (type === "triangle") {
    const r = size.width / 2
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - r)
    ctx.lineTo(pos.x - r, pos.y + r * 0.7)
    ctx.lineTo(pos.x + r, pos.y + r * 0.7)
    ctx.closePath()
    ctx.stroke()
  }

  // label
  ctx.font = "bold 7px monospace"
  ctx.textAlign = "center"
  ctx.fillText(ann.label, pos.x, pos.y + size.height / 2 + 10)
}
