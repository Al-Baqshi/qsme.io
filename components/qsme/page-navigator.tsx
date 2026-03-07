"use client"

import { useState, useRef, useEffect } from "react"
import type { QSPage } from "@/lib/qsme-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { FileText, CheckCircle2, Loader2, AlertCircle, Clock, Pencil, Minus, Play } from "lucide-react"

interface PageNavigatorProps {
  pages: QSPage[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
  /** When set, thumbnail area shows the actual page image from GET /pages/{id}/image */
  pageImageBaseUrl?: string | null
  /** When set, clicking Extract on a page card triggers extraction */
  onExtractPage?: (pageId: string) => void
  /** Multi-select: which page IDs are selected for batch extraction */
  selectedPageIds?: Set<string>
  onTogglePage?: (pageId: string) => void
  onSelectAll?: () => void
  onClearSelection?: () => void
  onExtractSelected?: (pageIds: string[]) => void
  extracting?: boolean
}

const STATUS_ICONS = {
  queued: Clock,
  processing: Loader2,
  done: CheckCircle2,
  error: AlertCircle,
}

function PageCard({
  page,
  isSelected,
  onSelectPage,
  pageImageUrl,
  onExtractPage,
  isChecked,
  onToggleCheck,
}: {
  page: QSPage
  isSelected: boolean
  onSelectPage: (id: string) => void
  pageImageUrl?: string | null
  onExtractPage?: (pageId: string) => void
  isChecked?: boolean
  onToggleCheck?: (pageId: string) => void
}) {
  const isExtracted = !!(page.textContent || (page.structuredContent?.length ?? 0) > 0)
  const [name, setName] = useState(page.name)
  const [isRenaming, setIsRenaming] = useState(false)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const commitRename = () => {
    const trimmed = name.trim()
    if (!trimmed) setName(page.name)
    setIsRenaming(false)
  }

  const StatusIcon = STATUS_ICONS[page.status]

  return (
    <div
      className={cn(
        "w-full rounded-md border transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* clickable thumbnail area - 44px min touch target on mobile */}
      <div className="relative">
        {onToggleCheck && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleCheck(page.id)
            }}
            className="absolute top-1 left-1 z-20 w-5 h-5 rounded border-2 border-background bg-background/80 flex items-center justify-center hover:bg-background transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:w-5 sm:h-5"
            aria-label={isChecked ? "Deselect page" : "Select page for extraction"}
          >
            {isChecked ? (
              <CheckCircle2 className="h-3 w-3 text-primary" />
            ) : (
              <div className="w-3 h-3 rounded-sm border border-muted-foreground" />
            )}
          </button>
        )}
        <button
          onClick={() => onSelectPage(page.id)}
          className="w-full text-left p-1.5 sm:p-2 pb-1 rounded-t-md min-h-[44px] flex flex-col"
        >
          <div
            className={cn(
              "w-full aspect-[4/3] rounded-sm flex items-center justify-center overflow-hidden relative",
              isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {pageImageUrl ? (
              <img
                src={pageImageUrl}
                alt={`Page ${page.number}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}
            <span className={cn(
              "text-base sm:text-lg font-bold relative z-10",
              pageImageUrl && "text-white drop-shadow-md"
            )}>
              {page.number}
            </span>
          </div>
        </button>
      </div>

      {/* info row */}
      <div className="px-1.5 sm:px-2 pb-1.5 sm:pb-2 flex flex-col gap-0.5 sm:gap-1">
        {/* name + rename */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          {isRenaming ? (
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename()
                if (e.key === "Escape") {
                  setName(page.name)
                  setIsRenaming(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-xs font-medium bg-background border border-primary rounded px-1 py-0.5 outline-none text-foreground"
              aria-label="Page name"
            />
          ) : (
            <button
              onClick={() => onSelectPage(page.id)}
              className="flex-1 min-w-0 text-left"
            >
              <span className="text-xs font-medium text-foreground truncate block">
                {name}
              </span>
            </button>
          )}

          <div className="flex items-center gap-0.5 shrink-0">
            {(hovered || isRenaming) && !isRenaming && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsRenaming(true)
              }}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center sm:min-h-0 sm:min-w-0 sm:p-0.5"
              title="Rename page"
            >
                <Pencil className="h-2.5 w-2.5" />
              </button>
            )}
            <StatusIcon
              className={cn(
                "h-3 w-3",
                page.status === "done" && "text-chart-2",
                page.status === "processing" && "text-chart-4 animate-spin",
                page.status === "error" && "text-destructive",
                page.status === "queued" && "text-muted-foreground"
              )}
            />
          </div>
        </div>

        {/* extraction status + tags */}
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "text-[9px] flex items-center gap-0.5",
              isExtracted ? "text-chart-2" : "text-muted-foreground"
            )}
            title={isExtracted ? "Extracted" : "Needs extraction"}
          >
            {isExtracted ? (
              <CheckCircle2 className="h-2.5 w-2.5" />
            ) : onExtractPage ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onExtractPage(page.id)
                }}
                className="text-primary hover:underline text-[9px]"
              >
                Extract
              </button>
            ) : (
              <Minus className="h-2.5 w-2.5" />
            )}
          </span>
          {page.tags.length > 0 && page.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PageNavigator({
  pages,
  selectedPageId,
  onSelectPage,
  pageImageBaseUrl,
  onExtractPage,
  selectedPageIds = new Set(),
  onTogglePage,
  onSelectAll,
  onClearSelection,
  onExtractSelected,
  extracting = false,
}: PageNavigatorProps) {
  const selectedCount = selectedPageIds.size
  const hasSelection = selectedCount > 0

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 sm:gap-2 py-6 sm:py-8 px-2">
        <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground text-center">
          No pages extracted yet
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {onTogglePage && onSelectAll && onClearSelection && (
        <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-b border-border shrink-0">
          <div className="flex items-center gap-1 text-[9px]">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-primary hover:underline"
            >
              Select all
            </button>
            {hasSelection && (
              <>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-muted-foreground hover:underline"
                >
                  Clear
                </button>
              </>
            )}
          </div>
          {hasSelection && onExtractSelected && (
            <Button
              size="sm"
              variant="default"
              className="h-6 text-[9px] px-2"
              disabled={extracting}
              onClick={() => onExtractSelected(Array.from(selectedPageIds))}
            >
              {extracting ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin mr-0.5" />
              ) : (
                <Play className="h-2.5 w-2.5 mr-0.5" />
              )}
              Extract {selectedCount}
            </Button>
          )}
        </div>
      )}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-1 sm:gap-1.5 p-1.5 sm:p-2">
          {pages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              isSelected={page.id === selectedPageId}
              onSelectPage={onSelectPage}
              pageImageUrl={pageImageBaseUrl && page.id ? `${pageImageBaseUrl.replace(/\/$/, "")}/pages/${page.id}/image` : page.imageUrl?.startsWith("http") ? page.imageUrl : null}
              onExtractPage={onExtractPage}
              isChecked={selectedPageIds.has(page.id)}
              onToggleCheck={onTogglePage}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
