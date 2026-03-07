"use client"

import { useEffect, useMemo, useState } from "react"
import type {
  QSPage,
  QSRoom,
  QSDimension,
  QSNote,
  QSAnnotation,
  StructuredContentBlock,
  NormalizedBbox,
} from "@/lib/qsme-types"
import type { QSIssue } from "@/lib/qsme-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle2,
  XCircle,
  Edit3,
  AlertTriangle,
  MapPin,
  Plus,
  FileText,
  Copy,
  Loader2,
  Zap,
  Maximize2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getPageStructureJson } from "@/lib/qsme-api"

interface ExtractionPanelProps {
  page: QSPage | null
  issues: QSIssue[]
  onSelectDimension: (id: string) => void
  onSelectAnnotation: (id: string) => void
  selectedDimensionId: string | null
  selectedAnnotationId: string | null
  onExtractPage?: (pageId: string, force?: boolean) => void
  extractingPageId?: string | null
  /** When user clicks Locate on a block with bbox, highlight that region on the page image. */
  onLocateBlock?: (bbox: NormalizedBbox) => void
  /** Aspect ratio for layout-mimic view (width/height). Default 0.75 (portrait). */
  pageAspectRatio?: number
  /** When set, enables "Copy all pages (Markdown)" button. */
  allPages?: QSPage[]
  /** Base URL for page/figure images (e.g. from getBaseUrl()). Used to build figure image URLs. */
  pageImageBaseUrl?: string | null
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 90
      ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
      : value >= 75
      ? "bg-chart-4/15 text-chart-4 border-chart-4/30"
      : "bg-destructive/15 text-destructive border-destructive/30"

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 font-medium ${color}`}>
      {value}%
    </Badge>
  )
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  kitchen: "Kitchen",
  living: "Living",
  dining: "Dining",
  storage: "Storage",
  corridor: "Corridor",
  utility: "Utility",
  office: "Office",
  reception: "Reception",
  other: "Other",
}

/** Convert structured blocks to markdown for AI paste. */
function blocksToMarkdown(blocks: StructuredContentBlock[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (block.type === "table") {
      const rows = normalizeTableContent(block.content)
      if (rows.length) {
        const header = rows[0].map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")
        const sep = rows[0].map(() => "---").join(" | ")
        parts.push(`| ${header} |`)
        parts.push(`| ${sep} |`)
        for (const row of rows.slice(1)) {
          parts.push(`| ${row.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`)
        }
        parts.push("")
      }
    } else if (block.type === "list") {
      const items = block.content as string[]
      for (const item of items) {
        parts.push(`- ${String(item).replace(/\n/g, " ")}`)
      }
      parts.push("")
    } else if (block.type === "note") {
      parts.push("## Note")
      parts.push("")
      parts.push(String(block.content))
      parts.push("")
    } else if (block.type === "dimensions") {
      parts.push("## Dimensions")
      parts.push("")
      parts.push(String(block.content))
      parts.push("")
    } else if (block.type === "figure") {
      parts.push("[Figure]")
      parts.push("")
    } else if ("content" in block) {
      const content = typeof block.content === "string" ? block.content : Array.isArray(block.content) && block.content[0] ? (block.content as string[][]).map((r) => r.join(" ")).join("\n") : ""
      if (content) {
        parts.push(content)
        parts.push("")
      }
    }
  }
  return parts.join("\n").trim()
}

/** Normalize table content: backend may send string, string[], or string[][]. Returns rows of cells. */
function normalizeTableContent(raw: unknown): string[][] {
  if (!raw) return []
  if (typeof raw === "string") {
    return raw.split(/\r?\n/).filter((ln) => ln.trim()).map((ln) => [ln.trim()])
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0]
    if (typeof first === "string") {
      return (raw as string[]).map((cell) => [String(cell)])
    }
    if (Array.isArray(first)) {
      return (raw as string[][]).map((row) =>
        Array.isArray(row) ? row.map((c) => String(c ?? "")) : [String(row)]
      )
    }
    return [[String(first)]]
  }
  return []
}

/** Sort blocks by reading order: top-to-bottom (y1), then left-to-right (x1). */
function sortBlocksByReadingOrder(blocks: StructuredContentBlock[]): StructuredContentBlock[] {
  return [...blocks].sort((a, b) => {
    const ay = a.bbox?.[1] ?? 0
    const by = b.bbox?.[1] ?? 0
    if (Math.abs(ay - by) > 0.02) return ay - by
    return (a.bbox?.[0] ?? 0) - (b.bbox?.[0] ?? 0)
  })
}

/** Renders a table (inline or in expand dialog). 2-col tables can render as key-value. */
function TableBlock({
  normalizedRows,
  typeLabel,
  LocateButton,
  showTypeBadge,
  block,
}: {
  normalizedRows: string[][]
  typeLabel: string
  LocateButton: React.ReactNode
  showTypeBadge?: boolean
  block: StructuredContentBlock
}) {
  const [expandOpen, setExpandOpen] = useState(false)
  const isKeyValue = normalizedRows[0]?.length === 2 && normalizedRows.length >= 1
  const KeyValueEl = ({ compact }: { compact?: boolean }) => (
    <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 ${compact ? "text-[11px]" : "text-sm"}`}>
      {normalizedRows.map((row, ri) => (
        <div key={ri} className="contents">
          <dt className="font-medium text-muted-foreground truncate">{row[0]}</dt>
          <dd className="text-foreground break-words">{row[1] ?? ""}</dd>
        </div>
      ))}
    </dl>
  )
  const TableEl = ({ compact }: { compact?: boolean }) => (
    <table className={`w-full border-collapse ${compact ? "min-w-[200px] text-[11px]" : "text-sm min-w-[300px]"}`}>
      <thead>
        <tr className="bg-muted/50 border-b border-border">
          {normalizedRows[0].map((cell, i) => (
            <th key={i} className="text-left font-medium text-foreground px-2 py-1.5 whitespace-nowrap">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-muted-foreground">
        {normalizedRows.slice(1).map((row, ri) => (
          <tr key={ri} className="border-b border-border/50">
            {row.map((cell, ci) => (
              <td key={ci} className="px-2 py-1 break-words align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
  return (
    <>
      <div className="overflow-x-auto rounded-md border border-border">
        <div className="flex items-center justify-between p-1 border-b border-border/50 gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            {showTypeBadge && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground shrink-0">
                {typeLabel}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => {
                const md = blocksToMarkdown([{ type: "table", content: normalizedRows } as StructuredContentBlock])
                if (md) navigator.clipboard.writeText(md)
              }}
              aria-label="Copy table as Markdown"
            >
              <Copy className="h-3 w-3 mr-0.5" />
              Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setExpandOpen(true)}
              aria-label="Expand table to full view"
            >
              <Maximize2 className="h-3 w-3 mr-0.5" />
              Expand
            </Button>
          </div>
          {LocateButton}
        </div>
        <div className="max-h-[280px] overflow-auto">
          {isKeyValue ? <KeyValueEl compact /> : <TableEl compact />}
        </div>
      </div>
      <Dialog open={expandOpen} onOpenChange={setExpandOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] w-fit flex flex-col gap-0 p-0">
          <DialogHeader className="p-4 pb-2 shrink-0 flex flex-row items-center justify-between gap-2">
            <DialogTitle className="text-base">Table — full view</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                const md = blocksToMarkdown([{ type: "table", content: normalizedRows } as StructuredContentBlock])
                if (md) navigator.clipboard.writeText(md)
              }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 pt-0 min-h-0">
            {isKeyValue ? <KeyValueEl /> : <TableEl />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Renders one structured block so tables stay tables, notes/dimensions are labeled. */
function StructuredBlockView({
  block,
  index,
  onLocate,
  showTypeBadge,
  figureImageUrl,
}: {
  block: StructuredContentBlock
  index: number
  onLocate?: (bbox: NormalizedBbox) => void
  showTypeBadge?: boolean
  figureImageUrl?: string | null
}) {
  const hasBbox = !!block.bbox && Array.isArray(block.bbox) && block.bbox.length >= 4
  const typeLabel = block.type === "table" ? "Table" : block.type === "note" ? "Note" : block.type === "dimensions" ? "Dimensions" : block.type === "list" ? "List" : block.type === "figure" ? "Figure" : block.type === "footer" ? "Footer" : "Text"
  const LocateButton = hasBbox && onLocate ? (
    <button
      type="button"
      className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 min-h-[44px] sm:min-h-0 justify-center rounded-md hover:bg-muted/50 px-2"
      onClick={() => onLocate(block.bbox as NormalizedBbox)}
    >
      <MapPin className="h-2.5 w-2.5" /> Locate
    </button>
  ) : null

  if (block.type === "figure") {
    return (
      <div className="rounded-md border border-border overflow-hidden">
        <div className="flex items-center justify-between p-1 border-b border-border/50">
          {showTypeBadge && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">
              {typeLabel}
            </Badge>
          )}
          {LocateButton}
        </div>
        {figureImageUrl ? (
          <img
            src={figureImageUrl}
            alt="Extracted figure"
            className="w-full max-h-[300px] object-contain bg-muted/20"
          />
        ) : (
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
            Figure (no image)
          </div>
        )}
      </div>
    )
  }

  if (block.type === "table") {
    const rows = normalizeTableContent(block.content)
    if (!rows.length) return null
    const colCount = Math.max(...rows.map((r) => r.length))
    const normalizedRows = rows.map((r) =>
      r.length < colCount ? [...r, ...Array(colCount - r.length).fill("")] : r.slice(0, colCount)
    )
    return (
      <TableBlock
        normalizedRows={normalizedRows}
        typeLabel={typeLabel}
        LocateButton={LocateButton}
        showTypeBadge={showTypeBadge}
        block={block}
      />
    )
  }
  if (block.type === "note") {
    return (
      <div className="rounded-md border border-border bg-card px-2 py-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {showTypeBadge ? <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">{typeLabel}</Badge> : "Note"}
          </div>
          {LocateButton}
        </div>
        <div className="text-xs text-foreground whitespace-pre-wrap break-words select-text">
          {block.content}
        </div>
      </div>
    )
  }
  if (block.type === "dimensions") {
    return (
      <div className="rounded-md border border-border bg-muted/20 px-2 py-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {showTypeBadge ? <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">{typeLabel}</Badge> : "Dimensions"}
          </div>
          {LocateButton}
        </div>
        <div className="text-xs font-mono text-foreground whitespace-pre-wrap break-words select-text">
          {block.content}
        </div>
      </div>
    )
  }
  if (block.type === "list") {
    const items = block.content as string[]
    return (
      <div className="rounded-md border border-border bg-card px-2 py-2">
        {(LocateButton || showTypeBadge) && (
          <div className="flex items-center justify-between mb-1">
            {showTypeBadge ? <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">{typeLabel}</Badge> : <span />}
            {LocateButton}
          </div>
        )}
        <ul className="text-xs text-foreground list-disc list-inside space-y-0.5 select-text">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    )
  }
  /* Legacy or unknown: footer / other — show as plain content (table or text) to match paper */
  if (block.type === "footer") {
    const isTable = Array.isArray(block.content) && block.content.length > 0 && Array.isArray(block.content[0])
    if (isTable) {
      return (
        <div className="overflow-x-auto rounded-md border border-border">
          {(LocateButton || showTypeBadge) && (
            <div className="flex items-center justify-between p-1 border-b border-border/50">
              {showTypeBadge ? <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">{typeLabel}</Badge> : <span />}
              {LocateButton}
            </div>
          )}
          <table className="w-full min-w-[200px] text-[11px] border-collapse">
            <tbody className="text-muted-foreground">
              {(block.content as string[][]).map((row, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    return (
      <div className="rounded border border-border/50 bg-background/50 px-2 py-1.5">
        {(LocateButton || showTypeBadge) && (
          <div className="flex items-center justify-between mb-1">
            {showTypeBadge ? <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">{typeLabel}</Badge> : <span />}
            {LocateButton}
          </div>
        )}
        <div className="text-xs text-foreground whitespace-pre-wrap break-words select-text">
          {block.content as string}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded border border-border/50 bg-background/50 px-2 py-1.5">
      {(LocateButton || showTypeBadge) && (
        <div className="flex items-center justify-between mb-1">
          {showTypeBadge ? <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">{typeLabel}</Badge> : <span />}
          {LocateButton}
        </div>
      )}
      <div className="text-xs text-foreground whitespace-pre-wrap break-words select-text">
        {block.content}
      </div>
    </div>
  )
}

function StructuredContentSection({
  blocks,
  fallbackText,
  title,
  onLocate,
  showTypeBadge,
  pageImageBaseUrl,
  pageId,
}: {
  blocks: StructuredContentBlock[]
  fallbackText: string
  title?: string
  onLocate?: (bbox: NormalizedBbox) => void
  showTypeBadge?: boolean
  pageImageBaseUrl?: string | null
  pageId?: string | null
}) {
  const getFigureUrl = (block: StructuredContentBlock) => {
    if (block.type !== "figure" || pageImageBaseUrl == null || pageId == null) return null
    const idx = "figureIndex" in block ? (block as { figureIndex?: number }).figureIndex : undefined
    if (typeof idx !== "number") return null
    const base = pageImageBaseUrl.replace(/\/$/, "")
    return `${base}/pages/${pageId}/figures/${idx}`
  }
  if (blocks.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        {title && (
          <h4 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h4>
        )}
        {blocks.map((block, i) => (
          <StructuredBlockView
            key={i}
            block={block}
            index={i}
            onLocate={onLocate}
            showTypeBadge={showTypeBadge}
            figureImageUrl={block.type === "figure" ? getFigureUrl(block) : undefined}
          />
        ))}
      </div>
    )
  }
  return (
    <div className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words select-text rounded-md border border-border bg-muted/30 px-2 py-2 min-h-[2rem]">
      {fallbackText || "No content."}
    </div>
  )
}

export function ExtractionPanel({
  page,
  issues,
  onSelectDimension,
  onSelectAnnotation,
  selectedDimensionId,
  selectedAnnotationId,
  onExtractPage,
  extractingPageId,
  onLocateBlock,
  pageAspectRatio = 0.75,
  allPages,
  pageImageBaseUrl,
}: ExtractionPanelProps) {
  if (!page) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] p-4">
        <p className="text-xs sm:text-sm text-muted-foreground text-center">
          Select a page to view extraction results
        </p>
      </div>
    )
  }

  const structured = page.structuredContent ?? []
  const readingOrderBlocks = useMemo(() => sortBlocksByReadingOrder(structured), [structured])
  const [documentViewMode, setDocumentViewMode] = useState<"list" | "layout">("list")
  const [structureJson, setStructureJson] = useState<string | null>(null)
  const [structureJsonLoading, setStructureJsonLoading] = useState(false)
  const isExtractingThisPage = extractingPageId === page.id
  const needsExtraction = !page.textContent || (page.structuredContent?.length === 0)

  useEffect(() => {
    if (!page?.id) return
    let cancelled = false
    setStructureJsonLoading(true)
    setStructureJson(null)
    getPageStructureJson(page.id)
      .then((res) => {
        if (cancelled) return
        const raw = res.rawStructure
        setStructureJson(
          raw != null ? JSON.stringify(raw, null, 2) : JSON.stringify(page.structuredContent ?? [], null, 2)
        )
      })
      .catch(() => {
        if (cancelled) return
        setStructureJson(JSON.stringify(page.structuredContent ?? [], null, 2))
      })
      .finally(() => {
        if (!cancelled) setStructureJsonLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page?.id])

  return (
    <>
      {onExtractPage && (
        <div className="shrink-0 p-2 border-b border-border flex flex-col gap-1">
          {page.extractionSource && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 w-fit text-muted-foreground">
              {page.extractionSource === "pp_structure_v3"
                ? "PP-StructureV3"
                : page.extractionSource === "paddle_basic"
                ? "Paddle"
                : page.extractionSource === "tesseract"
                ? "Tesseract"
                : page.extractionSource === "pdf_text"
                ? "PDF text"
                : page.extractionSource}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs min-h-[44px] sm:min-h-0"
            onClick={() => onExtractPage(page.id, !needsExtraction)}
            disabled={isExtractingThisPage}
          >
            {isExtractingThisPage ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <Zap className="h-3 w-3 mr-1.5" />
            )}
            {isExtractingThisPage ? "Extracting…" : needsExtraction ? "Extract this page" : "Re-extract this page"}
          </Button>
          {needsExtraction && !isExtractingThisPage && (
            <p className="text-[10px] text-muted-foreground text-center">
              No text/OCR yet. Extraction detects tables, notes, dimensions, and layout from the drawing.
            </p>
          )}
        </div>
      )}
    <Tabs defaultValue="document" className="h-full flex flex-col min-h-0">
      <div className="shrink-0 px-2 sm:px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Document parsing</h3>
      </div>
      <TabsList className="w-full shrink-0 justify-start rounded-none border-b border-border bg-transparent px-1 sm:px-2 gap-0 min-h-[44px] overflow-x-auto">
        <TabsTrigger value="document" className="text-[10px] sm:text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-2 sm:px-3 py-2 min-h-[44px] shrink-0">
          Document parsing
        </TabsTrigger>
        <TabsTrigger value="json" className="text-[10px] sm:text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-2 sm:px-3 py-2 min-h-[44px] shrink-0">
          JSON
        </TabsTrigger>
      </TabsList>

      {/* Document parsing — figures, tables, text in reading order (PaddleOCR Studio style) */}
      <TabsContent value="document" className="flex-1 m-0 overflow-hidden min-h-0">
        <div className="p-2 sm:p-3 flex flex-col h-full gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] sm:text-xs text-muted-foreground flex-1 min-w-0">
              Content as on the page. Use Locate to highlight on the drawing.
            </p>
            <div className="flex shrink-0 rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setDocumentViewMode("list")}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${documentViewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setDocumentViewMode("layout")}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${documentViewMode === "layout" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Layout
              </button>
            </div>
          </div>
          {documentViewMode === "list" ? (
            <>
              <ScrollArea className="flex-1 min-h-0">
                <div className="pr-2 flex flex-col gap-2">
                  <StructuredContentSection
                    blocks={readingOrderBlocks}
                    fallbackText={page.textContent ?? "No content extracted. Click Extract this page."}
                    onLocate={onLocateBlock}
                    showTypeBadge
                    pageImageBaseUrl={pageImageBaseUrl}
                    pageId={page.id}
                  />
                </div>
              </ScrollArea>
            </>
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div
                className="relative w-full border border-border rounded-md bg-muted/20 overflow-hidden"
                style={{ aspectRatio: String(pageAspectRatio) }}
              >
                {readingOrderBlocks.filter((b) => b.bbox && b.bbox.length >= 4).length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-4">
                    No blocks with position data. Use List view or re-extract with PP-StructureV3.
                  </div>
                ) : (
                  readingOrderBlocks.filter((b) => b.bbox && b.bbox.length >= 4).map((block, i) => {
                    const bbox = block.bbox!
                    const left = bbox[0] * 100
                    const top = bbox[1] * 100
                    const width = Math.max(2, (bbox[2] - bbox[0]) * 100)
                    const height = Math.max(2, (bbox[3] - bbox[1]) * 100)
                    return (
                      <div
                        key={i}
                        className="absolute overflow-hidden rounded border border-primary/40 bg-background/95 backdrop-blur-sm p-1"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          fontSize: "8px",
                        }}
                      >
                        <div className="h-full overflow-auto">
                          {block.type === "table" ? (() => {
                            const tblRows = normalizeTableContent(block.content)
                            return tblRows.length > 0 ? (
                              <table className="w-full text-[8px]">
                                <tbody>
                                  {tblRows.slice(0, 4).map((row, ri) => (
                                    <tr key={ri}>
                                      {row.slice(0, 3).map((cell, ci) => (
                                        <td key={ci} className="px-0.5 py-0 truncate max-w-[60px]">
                                          {String(cell)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <span className="line-clamp-3 break-words">
                                {"content" in block && typeof block.content === "string" ? block.content : block.type}
                              </span>
                            )
                          })() : (
                            <span className="line-clamp-3 break-words">
                              {"content" in block && typeof block.content === "string" ? block.content : block.type}
                            </span>
                          )}
                        </div>
                        {onLocateBlock && (
                          <button
                            type="button"
                            className="absolute bottom-0 right-0 p-0.5 rounded bg-primary/20 hover:bg-primary/40 text-primary"
                            onClick={() => onLocateBlock(block.bbox as NormalizedBbox)}
                            aria-label="Locate on drawing"
                          >
                            <MapPin className="h-2 w-2" />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          )}
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs min-h-[44px] sm:min-h-0"
              onClick={() => {
                const md = readingOrderBlocks.length > 0 ? blocksToMarkdown(readingOrderBlocks) : (page.textContent ?? "")
                if (md) navigator.clipboard.writeText(md)
              }}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy as Markdown
            </Button>
            {allPages && allPages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs min-h-[44px] sm:min-h-0 text-muted-foreground"
                onClick={() => {
                  const parts: string[] = []
                  for (const p of allPages) {
                    const blocks = p.structuredContent ?? []
                    const sorted = sortBlocksByReadingOrder(blocks)
                    parts.push(`## Page ${p.number}\n\n${blocks.length > 0 ? blocksToMarkdown(sorted) : (p.textContent ?? "")}`)
                  }
                  const md = parts.join("\n\n")
                  if (md) navigator.clipboard.writeText(md)
                }}
              >
                <Copy className="h-3 w-3 mr-1" /> Copy all pages (Markdown)
              </Button>
            )}
          </div>
        </div>
      </TabsContent>

      {/* JSON — raw PP-StructureV3 output or structuredContent fallback */}
      <TabsContent value="json" className="flex-1 m-0 overflow-hidden min-h-0">
        <div className="p-2 sm:p-3 flex flex-col h-full gap-2">
          <p className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
            Raw structure for this page. From PP-StructureV3 when available.
          </p>
          <ScrollArea className="flex-1 min-h-0">
            <pre className="p-2 sm:p-3 text-[10px] sm:text-xs font-mono text-foreground whitespace-pre-wrap break-words select-all rounded-md border border-border bg-muted/30 overflow-auto min-h-0">
              {structureJsonLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                </span>
              ) : structureJson ?? "No structure data."
              }
            </pre>
          </ScrollArea>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs min-h-[44px] sm:min-h-0 shrink-0"
            onClick={() => structureJson && navigator.clipboard.writeText(structureJson)}
            disabled={!structureJson}
          >
            <Copy className="h-3 w-3 mr-1" /> Copy JSON
          </Button>
        </div>
      </TabsContent>

    </Tabs>
    </>
  )
}

// ── Sub-components ──

function RoomRow({ room }: { room: QSRoom }) {
  return (
    <div className="border border-border rounded-md p-2 sm:p-2.5 bg-card hover:border-foreground/20 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-foreground truncate">{room.name}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground shrink-0">
            {ROOM_TYPE_LABELS[room.type] || room.type}
          </Badge>
        </div>
        <button className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-0.5 flex items-center justify-center" aria-label="Edit room">
          <Edit3 className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-muted-foreground">
        <span>
          <span className="font-mono font-medium text-foreground">{room.area}</span> m²
        </span>
        <span>
          <span className="font-mono font-medium text-foreground">{room.perimeter}</span> m peri
        </span>
        <span className="text-[10px]">L: {room.level}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <ConfidenceBadge value={room.confidence} />
        {room.verified && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-chart-2/15 text-chart-2 border-chart-2/30">
            Verified
          </Badge>
        )}
      </div>
    </div>
  )
}

function DimensionRow({
  dim,
  isSelected,
  onSelect,
}: {
  dim: QSDimension
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left border rounded-md p-2 sm:p-2.5 transition-colors min-h-[44px] flex flex-col justify-center ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-foreground/20"
      }`}
    >
      <div className="flex items-center justify-between mb-0.5 gap-2">
        <span className="text-xs font-medium text-foreground truncate">{dim.label}</span>
        <span className="text-xs font-mono font-bold text-foreground shrink-0">
          {dim.value} {dim.units}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
          {dim.type}
        </Badge>
        <ConfidenceBadge value={dim.confidence} />
        {dim.verified ? (
          <CheckCircle2 className="h-3 w-3 text-chart-2 shrink-0" />
        ) : (
          <XCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        )}
      </div>
    </button>
  )
}
