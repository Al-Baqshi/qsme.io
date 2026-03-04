"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { drawCircle } from "@/lib/draw-circle"

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  diameter: number
  chordLength: number | null
  chordAngle: number
}

const BASE_SIZE = 800

export function ExportModal({
  open,
  onOpenChange,
  diameter,
  chordLength,
  chordAngle,
}: ExportModalProps) {
  const [format, setFormat] = useState<"jpg" | "png">("jpg")

  // JPG options
  const [jpgQuality, setJpgQuality] = useState(90)
  const [jpgBgColor, setJpgBgColor] = useState("#ffffff")

  // Shared options
  const [scale, setScale] = useState(2)
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)

  // PNG options
  const [pngTransparent, setPngTransparent] = useState(true)

  const previewRef = useRef<HTMLCanvasElement>(null)

  const renderPreview = useCallback(() => {
    const canvas = previewRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const previewSize = 280
    canvas.width = previewSize * 2
    canvas.height = previewSize * 2
    ctx.scale(2, 2)

    const isTransparent = format === "png" && pngTransparent
    const bg = isTransparent ? null : jpgBgColor

    drawCircle(ctx, {
      diameter,
      chordLength,
      chordAngle,
      width: previewSize,
      height: previewSize,
      showGrid,
      showLabels,
      backgroundColor: bg,
    })
  }, [diameter, chordLength, chordAngle, format, jpgQuality, jpgBgColor, showGrid, showLabels, pngTransparent, scale])

  useEffect(() => {
    if (open) renderPreview()
  }, [open, renderPreview])

  function downloadImage() {
    const size = BASE_SIZE * scale
    const offscreen = document.createElement("canvas")
    offscreen.width = size
    offscreen.height = size
    const ctx = offscreen.getContext("2d")
    if (!ctx) return

    ctx.scale(scale, scale)

    const isTransparent = format === "png" && pngTransparent
    const bg = isTransparent ? null : jpgBgColor

    drawCircle(ctx, {
      diameter,
      chordLength,
      chordAngle,
      width: BASE_SIZE,
      height: BASE_SIZE,
      showGrid,
      showLabels,
      backgroundColor: bg,
    })

    const mimeType = format === "jpg" ? "image/jpeg" : "image/png"
    const quality = format === "jpg" ? jpgQuality / 100 : undefined

    offscreen.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `circle-export.${format === "jpg" ? "jpg" : "png"}`
        a.click()
        URL.revokeObjectURL(url)
      },
      mimeType,
      quality
    )
  }

  const exportSize = BASE_SIZE * scale

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Image</DialogTitle>
          <DialogDescription>Configure and download as JPG or PNG.</DialogDescription>
        </DialogHeader>

        <Tabs value={format} onValueChange={(v) => setFormat(v as "jpg" | "png")}>
          <TabsList className="w-full">
            <TabsTrigger value="jpg" className="flex-1">JPG</TabsTrigger>
            <TabsTrigger value="png" className="flex-1">PNG</TabsTrigger>
          </TabsList>

          {/* preview */}
          <div className="mt-3 flex justify-center">
            <canvas
              ref={previewRef}
              className="rounded-md border border-border"
              style={{
                width: 280,
                height: 280,
                background: format === "png" && pngTransparent
                  ? "repeating-conic-gradient(hsl(0 0% 88%) 0% 25%, white 0% 50%) 50% / 16px 16px"
                  : jpgBgColor,
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center mt-1">
            {exportSize} x {exportSize}px
          </p>

          {/* JPG options */}
          <TabsContent value="jpg" className="space-y-4 mt-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Quality: {jpgQuality}%
              </Label>
              <Slider
                min={10}
                max={100}
                step={5}
                value={[jpgQuality]}
                onValueChange={([v]) => setJpgQuality(v)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={jpgBgColor}
                  onChange={(e) => setJpgBgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                />
                <span className="text-xs font-mono text-muted-foreground">{jpgBgColor}</span>
              </div>
            </div>
          </TabsContent>

          {/* PNG options */}
          <TabsContent value="png" className="space-y-4 mt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Transparent Background</Label>
              <Switch checked={pngTransparent} onCheckedChange={setPngTransparent} />
            </div>
          </TabsContent>

          {/* shared options */}
          <div className="space-y-4 mt-4 pt-4 border-t border-border">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Scale: {scale}x ({exportSize}px)
              </Label>
              <Slider
                min={1}
                max={4}
                step={1}
                value={[scale]}
                onValueChange={([v]) => setScale(v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Show Grid</Label>
              <Switch checked={showGrid} onCheckedChange={setShowGrid} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Show Labels</Label>
              <Switch checked={showLabels} onCheckedChange={setShowLabels} />
            </div>
          </div>

          <Button className="w-full mt-4" onClick={downloadImage}>
            <Download className="h-4 w-4 mr-1" />
            Download {format.toUpperCase()}
          </Button>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
