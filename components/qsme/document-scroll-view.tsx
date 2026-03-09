"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import type { QSPage, NormalizedBbox } from "@/lib/qsme-types"
import { cn } from "@/lib/utils"

/** Region type to overlay color (PaddleOCR-style). */
const REGION_COLORS: Record<string, string> = {
  table_blocks: "border-blue-500 bg-blue-500/20",
  title_blocks: "border-green-600 bg-green-500/20",
  text_blocks: "border-amber-500 bg-amber-500/20",
  image_blocks: "border-violet-500 bg-violet-500/20",
  figure_blocks: "border-red-500 bg-red-500/20",
  note: "border-slate-400 bg-slate-400/20",
  drawing_area: "border-slate-400 bg-slate-400/10",
}
const DEFAULT_REGION_COLOR = "border-slate-500 bg-slate-500/10"

export interface DocumentScrollViewRegion {
  id: string
  region_type: string
  bbox: NormalizedBbox
}

export interface DocumentScrollViewProps {
  pages: QSPage[]
  zoom: number
  /** Base URL for page images, e.g. getBaseUrl(). Image URL = base + /pages/{id}/image */
  pageImageBaseUrl?: string | null
  /** Called when the user scrolls so the most-visible page changes (for extraction panel). */
  onPageInView?: (pageId: string) => void
  /** Optional: highlight the page that is "selected" (e.g. from sidebar click). */
  selectedPageId?: string | null
  /** Optional: scroll to and briefly highlight this page id (e.g. after clicking thumbnail). */
  scrollToPageId?: string | null
  /** Optional: highlight a region on the page image. bbox is [x1,y1,x2,y2] normalized 0-1. */
  highlightBbox?: NormalizedBbox | null
  /** Page id for which highlightBbox applies. */
  highlightPageId?: string | null
  /** Regions per page for drawing colored boxes; key = page id. */
  regionsByPageId?: Record<string, DocumentScrollViewRegion[]>
  /** Called when user clicks a region box (regionId, bbox, pageId). */
  onRegionClick?: (regionId: string, bbox: NormalizedBbox, pageId: string) => void
  /** Region id to highlight with stronger border (e.g. selected or located). */
  highlightRegionId?: string | null
}

export function DocumentScrollView({
  pages,
  zoom,
  pageImageBaseUrl,
  onPageInView,
  selectedPageId,
  scrollToPageId,
  highlightBbox,
  highlightPageId,
  regionsByPageId,
  onRegionClick,
  highlightRegionId,
}: DocumentScrollViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const [visiblePageId, setVisiblePageId] = useState<string | null>(null)
  const pageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())

  const updateContentHeight = useCallback(() => {
    if (contentRef.current) {
      const h = contentRef.current.offsetHeight
      if (h > 0) setContentHeight(h)
    }
  }, [])

  useEffect(() => {
    if (!contentRef.current) return
    const ro = new ResizeObserver(updateContentHeight)
    ro.observe(contentRef.current)
    return () => ro.disconnect()
  }, [updateContentHeight, pages.length])

  useEffect(() => {
    updateContentHeight()
  }, [updateContentHeight, pages, zoom])

  // Intersection observer: which page is most in view (run after refs are set)
  useEffect(() => {
    if (pages.length === 0 || !onPageInView) return
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageId = (entry.target as HTMLElement).dataset.pageId
          if (!pageId) return
          const ratio = entry.intersectionRatio
          if (ratio > 0) {
            setVisiblePageId((prev) => {
              if (ratio >= 0.5 || !prev) {
                queueMicrotask(() => onPageInView(pageId))
                return pageId
              }
              return prev
            })
          }
        })
      },
      { root: scrollEl, rootMargin: "-20% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    const timer = requestAnimationFrame(() => {
      pageRefsMap.current.forEach((el) => observer.observe(el))
    })
    return () => {
      cancelAnimationFrame(timer)
      observer.disconnect()
    }
  }, [pages, onPageInView])

  // Report initial visible page (defer parent callback to avoid setState-during-render)
  useEffect(() => {
    if (pages.length > 0 && onPageInView && !visiblePageId) {
      const firstId = pages[0].id
      setVisiblePageId(firstId)
      queueMicrotask(() => onPageInView(firstId))
    }
  }, [pages, onPageInView, visiblePageId])

  // Scroll to page when scrollToPageId is set (e.g. from sidebar click)
  useEffect(() => {
    if (!scrollToPageId || !scrollRef.current) return
    const el = pageRefsMap.current.get(scrollToPageId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [scrollToPageId])

  // Scroll to page when Locate is clicked (highlightBbox set) so the highlighted region is visible
  useEffect(() => {
    if (!highlightPageId || !highlightBbox || highlightBbox.length < 4 || !scrollRef.current) return
    const el = pageRefsMap.current.get(highlightPageId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightPageId, highlightBbox])

  if (pages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30 text-muted-foreground">
        <p className="text-sm">No pages yet. Upload a PDF to get started.</p>
      </div>
    )
  }

  const baseUrl = pageImageBaseUrl?.replace(/\/$/, "") ?? ""

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-auto bg-muted/20"
      style={{ minHeight: 0 }}
    >
      <div
        className="relative w-full"
        style={{ height: contentHeight * zoom || "auto", minHeight: "100%" }}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 mx-auto bg-background shadow-sm"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {pages.map((page) => {
            const imageUrl = baseUrl && page.id ? `${baseUrl}/pages/${page.id}/image` : page.imageUrl?.startsWith("http") ? page.imageUrl : null
            const isSelected = selectedPageId === page.id
            return (
              <div
                key={page.id}
                ref={(el) => {
                  if (el) pageRefsMap.current.set(page.id, el)
                }}
                data-page-id={page.id}
                className={cn(
                  "border-b border-border",
                  isSelected && "ring-2 ring-primary/50 ring-inset"
                )}
              >
                <div className="text-[10px] text-muted-foreground px-2 py-1 bg-muted/30">
                  Page {page.number}
                  {page.tags.length > 0 && (
                    <span className="ml-2">
                      {page.tags.slice(0, 2).join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex justify-center p-1 min-h-[200px]">
                  {imageUrl ? (
                    <div className="relative inline-block max-w-full">
                      <img
                        src={imageUrl}
                        alt={`Page ${page.number}`}
                        className="max-w-full h-auto block"
                        loading="lazy"
                      />
                      {highlightPageId === page.id && highlightBbox && highlightBbox.length >= 4 && (
                        <div
                          className="absolute border-2 border-primary/80 bg-primary/20 pointer-events-none"
                          style={{
                            left: `${highlightBbox[0] * 100}%`,
                            top: `${highlightBbox[1] * 100}%`,
                            width: `${(highlightBbox[2] - highlightBbox[0]) * 100}%`,
                            height: `${(highlightBbox[3] - highlightBbox[1]) * 100}%`,
                          }}
                        />
                      )}
                      {regionsByPageId?.[page.id]?.map((region) => {
                        const bbox = region.bbox
                        if (!bbox || bbox.length < 4) return null
                        const isHighlight = highlightRegionId === region.id
                        const colorClass = REGION_COLORS[region.region_type] ?? DEFAULT_REGION_COLOR
                        return (
                          <button
                            key={region.id}
                            type="button"
                            className={cn(
                              "absolute border cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                              colorClass,
                              isHighlight && "ring-2 ring-primary ring-offset-1 border-primary opacity-100"
                            )}
                            style={{
                              left: `${bbox[0] * 100}%`,
                              top: `${bbox[1] * 100}%`,
                              width: `${(bbox[2] - bbox[0]) * 100}%`,
                              height: `${(bbox[3] - bbox[1]) * 100}%`,
                            }}
                            onClick={() => onRegionClick?.(region.id, bbox, page.id)}
                            aria-label={`Region ${region.region_type}`}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full h-48 bg-muted text-muted-foreground text-sm">
                      No image
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
