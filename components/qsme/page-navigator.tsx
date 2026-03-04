"use client"

import { useState, useRef, useEffect } from "react"
import type { QSPage } from "@/lib/qsme-types"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { FileText, CheckCircle2, Loader2, AlertCircle, Clock, Pencil } from "lucide-react"

interface PageNavigatorProps {
  pages: QSPage[]
  selectedPageId: string | null
  onSelectPage: (pageId: string) => void
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
}: {
  page: QSPage
  isSelected: boolean
  onSelectPage: (id: string) => void
}) {
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
      {/* clickable thumbnail area */}
      <button
        onClick={() => onSelectPage(page.id)}
        className="w-full text-left p-2 pb-1 rounded-t-md"
      >
        <div
          className={cn(
            "w-full aspect-[4/3] rounded-sm flex items-center justify-center",
            isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <span className="text-lg font-bold">{page.number}</span>
        </div>
      </button>

      {/* info row */}
      <div className="px-2 pb-2 flex flex-col gap-1">
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
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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

        {/* tags */}
        {page.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {page.tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[9px] px-1 py-0 h-4 text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function PageNavigator({
  pages,
  selectedPageId,
  onSelectPage,
}: PageNavigatorProps) {
  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 px-2">
        <FileText className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground text-center">
          No pages extracted yet
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1.5 p-2">
        {pages.map((page) => (
          <PageCard
            key={page.id}
            page={page}
            isSelected={page.id === selectedPageId}
            onSelectPage={onSelectPage}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
