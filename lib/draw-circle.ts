export interface DrawOptions {
  diameter: number | null
  chordLength: number | null
  chordAngle: number
  width: number
  height: number
  showGrid?: boolean
  showLabels?: boolean
  backgroundColor?: string | null // null = transparent
}

export function drawCircle(ctx: CanvasRenderingContext2D, opts: DrawOptions) {
  const {
    diameter,
    chordLength,
    chordAngle,
    width: w,
    height: h,
    showGrid = true,
    showLabels = true,
    backgroundColor = null,
  } = opts

  // background
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }

  // grid dots
  if (showGrid) {
    ctx.fillStyle = "hsl(0 0% 85%)"
    const spacing = 20
    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  if (!diameter) return

  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(diameter / 2, Math.min(w, h) / 2 - 40)

  // circle fill
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = "hsl(210 80% 55% / 0.08)"
  ctx.fill()

  // circle stroke
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = "hsl(210 80% 55%)"
  ctx.lineWidth = 2
  ctx.stroke()

  // center dot
  ctx.beginPath()
  ctx.arc(cx, cy, 3, 0, Math.PI * 2)
  ctx.fillStyle = "hsl(210 80% 55%)"
  ctx.fill()

  // diameter label
  if (showLabels) {
    ctx.fillStyle = "hsl(210 80% 40%)"
    ctx.font = "11px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(`d = ${diameter}`, cx, cy - radius - 10)
  }

  // draw chord
  if (chordLength && chordLength > 0) {
    const halfChord = Math.min(chordLength / 2, radius)
    const angleRad = (chordAngle * Math.PI) / 180

    const dist = Math.sqrt(Math.max(0, radius * radius - halfChord * halfChord))

    const perpX = -Math.sin(angleRad)
    const perpY = Math.cos(angleRad)

    const midX = cx + perpX * dist
    const midY = cy + perpY * dist

    const dirX = Math.cos(angleRad)
    const dirY = Math.sin(angleRad)

    const x1 = midX - dirX * halfChord
    const y1 = midY - dirY * halfChord
    const x2 = midX + dirX * halfChord
    const y2 = midY + dirY * halfChord

    // chord line
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = "hsl(350 75% 55%)"
    ctx.lineWidth = 2
    ctx.stroke()

    // chord endpoints
    ctx.fillStyle = "hsl(350 75% 55%)"
    ctx.beginPath()
    ctx.arc(x1, y1, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x2, y2, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // dashed line from center to chord midpoint
    if (dist > 5) {
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.moveTo(cx, cy)
      ctx.lineTo(midX, midY)
      ctx.strokeStyle = "hsl(0 0% 55%)"
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.setLineDash([])

      if (showLabels) {
        const labelX = (cx + midX) / 2 + perpX * 12
        const labelY = (cy + midY) / 2 + perpY * 12
        ctx.fillStyle = "hsl(0 0% 45%)"
        ctx.font = "10px system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(`d=${dist.toFixed(1)}`, labelX, labelY)
      }
    }

    // chord length label
    if (showLabels) {
      ctx.fillStyle = "hsl(350 75% 40%)"
      ctx.font = "11px system-ui, sans-serif"
      ctx.textAlign = "center"
      const labelOffsetX = perpX * 16
      const labelOffsetY = perpY * 16
      ctx.fillText(
        `l = ${chordLength}`,
        (x1 + x2) / 2 + labelOffsetX,
        (y1 + y2) / 2 + labelOffsetY
      )
    }
  }
}
