"use client"

import { useRef, useEffect, useCallback } from "react"
import { drawCircle } from "@/lib/draw-circle"

interface CircleCanvasProps {
  diameter: number | null
  chordLength: number | null
  chordAngle: number
}

export function CircleCanvas({ diameter, chordLength, chordAngle }: CircleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    drawCircle(ctx, {
      diameter,
      chordLength,
      chordAngle,
      width: rect.width,
      height: rect.height,
      showGrid: true,
      showLabels: true,
    })

    if (!diameter) {
      ctx.fillStyle = "hsl(0 0% 60%)"
      ctx.font = "14px system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Add a circle to get started", rect.width / 2, rect.height / 2)
    }
  }, [diameter, chordLength, chordAngle])

  // redraw on prop changes
  useEffect(() => {
    paint()
  }, [paint])

  // redraw on container resize (e.g. chat sidebar opening)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver(() => {
      paint()
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [paint])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg border border-border bg-card"
      style={{ minHeight: 300 }}
    />
  )
}
