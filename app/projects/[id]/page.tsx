"use client"

import { useState, use, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Save,
  Upload,
  Play,
  Settings2,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  Menu,
  MoreVertical,
  Loader2,
  AlertCircle,
  Trash2,
  CheckCircle2,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { PageNavigator } from "@/components/qsme/page-navigator"
import { DocumentScrollView } from "@/components/qsme/document-scroll-view"
import { ExtractionPanel } from "@/components/qsme/extraction-panel"
import { getProject } from "@/lib/qsme-mock-data"
import { MOCK_ISSUES } from "@/lib/qsme-mock-data"
import { getProjectContext, uploadDocument, createDocumentPages, exportProject, getProjectQuantities, getBaseUrl, deleteProject, updateProject, extractPage, QSMEApiError } from "@/lib/qsme-api"
import { contextToProject, issuesToQSIssues } from "@/lib/adapters/context-to-project"
import type { ProjectStatus } from "@/lib/qsme-types"
import type { QSProject } from "@/lib/qsme-types"
import type { QSIssue } from "@/lib/qsme-types"

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Processing", className: "bg-chart-4/15 text-chart-4 border-chart-4/30" },
  ready: { label: "Ready", className: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  error: { label: "Error", className: "bg-destructive/15 text-destructive border-destructive/30" },
}

function handleSelectPageForScroll(
  pageId: string,
  setSelectedPageId: (id: string) => void,
  setScrollToPageId: (id: string | null) => void
) {
  setSelectedPageId(pageId)
  setScrollToPageId(pageId)
  setTimeout(() => setScrollToPageId(null), 800)
}

function ProjectLeftSidebarContent({
  project,
  onFileSelect,
  uploading,
  onRunExtraction,
  onExtractPage,
  onExtractSelected,
  extracting,
  pages = [],
  selectedPageId = null,
  selectedPageIds = new Set(),
  onSelectPage,
  onTogglePage,
  onSelectAll,
  onClearSelection,
  pageImageBaseUrl,
}: {
  project: { name: string; location: string; client: string; files: { id: string; name: string; status: string }[]; settings: { discipline: string; units: string; autoDetectScale: boolean; ocrFallback: boolean } }
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploading?: boolean
  onRunExtraction?: (force?: boolean) => void
  onExtractPage?: (pageId: string) => void
  onExtractSelected?: (pageIds: string[]) => void
  extracting?: boolean
  pages?: { id: string; number: number; name: string; status: string; imageUrl?: string | null; textContent?: string | null; structuredContent?: unknown[] }[]
  selectedPageId?: string | null
  selectedPageIds?: Set<string>
  onSelectPage?: (pageId: string) => void
  onTogglePage?: (pageId: string) => void
  onSelectAll?: () => void
  onClearSelection?: () => void
  pageImageBaseUrl?: string | null
}) {
  return (
    <>
      <div className="p-3 border-b border-border">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Project
        </h2>
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-foreground font-medium truncate">{project.name}</span>
          <span className="text-muted-foreground">{project.location}</span>
          <span className="text-muted-foreground">{project.client}</span>
        </div>
      </div>
      <div className="p-3 border-b border-border">
        <label className="flex flex-col items-center gap-1 justify-center min-h-[44px] p-3 border-2 border-dashed border-border rounded-md hover:border-foreground/20 transition-colors cursor-pointer">
          <Upload className={`h-5 w-5 text-muted-foreground ${uploading ? "animate-pulse" : ""}`} />
          <span className="text-[10px] text-muted-foreground">
            {uploading ? "Uploading..." : "Drop PDFs here or click"}
          </span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            onChange={onFileSelect ?? (() => {})}
            disabled={uploading}
          />
        </label>
      </div>
      <div className="p-3 border-b border-border">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Files
        </h2>
        <div className="flex flex-col gap-1.5">
          {project.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 text-xs p-2 rounded-md border border-border bg-card"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground truncate flex-1">{file.name}</span>
              <Badge
                variant="outline"
                className={`text-[8px] px-1 py-0 h-3.5 shrink-0 ${
                  file.status === "ready"
                    ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
                    : file.status === "processing"
                    ? "bg-chart-4/15 text-chart-4 border-chart-4/30"
                    : file.status === "error"
                    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {file.status}
              </Badge>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-2">
          <Button
            size="sm"
            className="flex-1 text-xs min-h-[44px]"
            disabled={extracting || uploading || !project.files.length}
            onClick={() => onRunExtraction?.(false)}
          >
            {extracting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            {extracting ? "Extracting…" : "Extract all"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 min-h-[44px] px-2"
                disabled={extracting || uploading || !project.files.length}
                aria-label="Extract options"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => onRunExtraction?.(false)}>
                Unextracted only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRunExtraction?.(true)}>
                Re-extract all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {pages.length > 0 && onSelectPage && (
        <div className="border-b border-border flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pages
            </h2>
            {onRunExtraction && (
              <button
                type="button"
                onClick={() => onRunExtraction(false)}
                disabled={extracting || uploading}
                className="text-[9px] text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extracting ? "Extracting…" : "Extract all"}
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <PageNavigator
              pages={pages}
              selectedPageId={selectedPageId ?? null}
              onSelectPage={onSelectPage}
              pageImageBaseUrl={pageImageBaseUrl}
              onExtractPage={onExtractPage}
              selectedPageIds={selectedPageIds}
              onTogglePage={onTogglePage}
              onSelectAll={onSelectAll}
              onClearSelection={onClearSelection}
              onExtractSelected={onExtractSelected}
              extracting={extracting}
            />
          </div>
        </div>
      )}
      <Accordion type="single" collapsible className="px-3">
        <AccordionItem value="settings" className="border-b-0">
          <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2 hover:no-underline min-h-[44px]">
            <span className="flex items-center gap-1">
              <Settings2 className="h-3 w-3" />
              Extraction Settings
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3 pb-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Discipline</Label>
                <Select defaultValue={project.settings.discipline}>
                  <SelectTrigger className="h-9 text-xs min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="architectural" className="text-xs">Architectural</SelectItem>
                    <SelectItem value="electrical" className="text-xs">Electrical</SelectItem>
                    <SelectItem value="plumbing" className="text-xs">Plumbing</SelectItem>
                    <SelectItem value="structural" className="text-xs">Structural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Units</Label>
                <Select defaultValue={project.settings.units}>
                  <SelectTrigger className="h-9 text-xs min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm" className="text-xs">mm</SelectItem>
                    <SelectItem value="cm" className="text-xs">cm</SelectItem>
                    <SelectItem value="m" className="text-xs">m</SelectItem>
                    <SelectItem value="in" className="text-xs">in</SelectItem>
                    <SelectItem value="ft" className="text-xs">ft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between min-h-[44px]">
                <Label className="text-xs text-muted-foreground">Auto-detect scale</Label>
                <Switch defaultChecked={project.settings.autoDetectScale} className="scale-90" />
              </div>
              <div className="flex items-center justify-between min-h-[44px]">
                <Label className="text-xs text-muted-foreground">OCR fallback</Label>
                <Switch defaultChecked={project.settings.ocrFallback} className="scale-90" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  )
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [project, setProject] = useState<QSProject | null>(USE_MOCK_DATA ? getProject(id) ?? null : null)
  const [issues, setIssues] = useState<QSIssue[]>(USE_MOCK_DATA ? MOCK_ISSUES : [])
  const [loading, setLoading] = useState(!USE_MOCK_DATA)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatusMessage, setUploadStatusMessage] = useState("Uploading document…")
  const [uploadDoneMessage, setUploadDoneMessage] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState(0)
  const [extractProgressMessage, setExtractProgressMessage] = useState("")
  const [extractDoneMessage, setExtractDoneMessage] = useState<string | null>(null)
  const [extractingPageId, setExtractingPageId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadProgressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [editingProjectName, setEditingProjectName] = useState(false)
  const [projectNameEdit, setProjectNameEdit] = useState("")
  const projectNameInputRef = useRef<HTMLInputElement>(null)
  const projectNameEditRef = useRef("")
  projectNameEditRef.current = projectNameEdit

  const refetch = useCallback(() => {
    if (USE_MOCK_DATA) return
    setError(null)
    getProjectContext(id)
      .then((ctx) => {
        const quantities = ctx.quantities ?? null
        setProject(contextToProject(ctx, quantities))
        setIssues(issuesToQSIssues(ctx.issues))
      })
      .catch((err) => {
        setError(err instanceof QSMEApiError ? err.message : "Failed to load project")
      })
  }, [id])

  useEffect(() => {
    if (USE_MOCK_DATA) return
    setLoading(true)
    getProjectContext(id)
      .then((ctx) => {
        getProjectQuantities(id)
          .then((q) => {
            setProject(contextToProject(ctx, q))
          })
          .catch(() => {
            setProject(contextToProject(ctx, null))
          })
        setIssues(issuesToQSIssues(ctx.issues))
      })
      .catch((err) => {
        setError(err instanceof QSMEApiError ? err.message : "Failed to load project")
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file || !project || USE_MOCK_DATA) return
      setUploading(true)
      setError(null)
      setUploadDoneMessage(null)
      setUploadProgress(0)
      setUploadStatusMessage("Uploading document…")
      if (uploadProgressRef.current) clearInterval(uploadProgressRef.current)
      uploadProgressRef.current = setInterval(() => {
        setUploadProgress((p) => (p >= 90 ? 90 : p + 4))
      }, 800)
      uploadDocument(project.id, file)
        .then((doc) => {
          setUploadStatusMessage("Preparing page images…")
          return createDocumentPages(doc.id)
        })
        .then(() =>
          Promise.all([
            getProjectContext(project.id),
            getProjectQuantities(project.id).catch(() => null),
          ])
        )
        .then(([ctx, q]) => {
          if (uploadProgressRef.current) {
            clearInterval(uploadProgressRef.current)
            uploadProgressRef.current = null
          }
          setUploadProgress(100)
          setProject(contextToProject(ctx, q))
          setIssues(issuesToQSIssues(ctx.issues))
          const pages = ctx.pages ?? []
          if (pages.length > 0) {
            const firstId = pages[0].id
            setSelectedPageId(firstId)
            setScrollToPageId(firstId)
            setTimeout(() => setScrollToPageId(null), 800)
          }
          setUploadDoneMessage("Document uploaded. Click Run Extraction to get text, tables, and OCR.")
          setLeftSheetOpen(true)
          setTimeout(() => setUploadDoneMessage(null), 5000)
        })
        .catch((err) => {
          if (uploadProgressRef.current) {
            clearInterval(uploadProgressRef.current)
            uploadProgressRef.current = null
          }
          setError(err instanceof QSMEApiError ? err.message : "Upload failed")
        })
        .finally(() => {
          setTimeout(() => {
            setUploading(false)
            setUploadProgress(0)
            setUploadStatusMessage("Uploading document…")
          }, 600)
        })
      e.target.value = ""
    },
    [project]
  )

  const handleRunExtraction = useCallback((force?: boolean) => {
    if (!project || USE_MOCK_DATA) return
    const allPages = project.files.flatMap((f) => f.pages)
    const toExtract = force ? allPages : allPages.filter((p) => !p.textContent || (p.structuredContent?.length === 0))
    if (toExtract.length === 0) {
      setExtractDoneMessage(force ? "No pages to re-extract." : "All pages already extracted.")
      setTimeout(() => setExtractDoneMessage(null), 3000)
      return
    }
    setExtracting(true)
    setError(null)
    setExtractDoneMessage(null)
    setExtractProgress(0)
    setExtractProgressMessage(`Extracting page 1 of ${toExtract.length}…`)
    let done = 0
    const run = async () => {
      try {
        for (let i = 0; i < toExtract.length; i++) {
          setExtractProgressMessage(`Extracting page ${i + 1} of ${toExtract.length}…`)
          await extractPage(toExtract[i].id, { force })
          done++
          setExtractProgress(Math.round((done / toExtract.length) * 100))
        }
        setExtractProgress(100)
        const [ctx, q] = await Promise.all([
          getProjectContext(project.id),
          getProjectQuantities(project.id).catch(() => null),
        ])
        setProject(contextToProject(ctx, q))
        setIssues(issuesToQSIssues(ctx.issues))
        const pages = ctx.pages ?? []
        if (pages.length > 0) {
          const firstId = pages[0].id
          setSelectedPageId(firstId)
          setScrollToPageId(firstId)
          setTimeout(() => setScrollToPageId(null), 800)
        }
        setExtractDoneMessage(
          `Extraction complete — ${done} page${done !== 1 ? "s" : ""} ready`
        )
        setLeftSheetOpen(true)
        setTimeout(() => setExtractDoneMessage(null), 5000)
      } catch (err) {
        setError(err instanceof QSMEApiError ? err.message : "Extraction failed")
      } finally {
        setExtracting(false)
        setExtractProgress(0)
        setExtractProgressMessage("")
      }
    }
    run()
  }, [project])

  const handleExtractCurrentPage = useCallback((pageId: string, force?: boolean) => {
    if (!project || USE_MOCK_DATA) return
    setExtractingPageId(pageId)
    setError(null)
    extractPage(pageId, { force })
      .then(() =>
        Promise.all([
          getProjectContext(project.id),
          getProjectQuantities(project.id).catch(() => null),
        ])
      )
      .then(([ctx, q]) => {
        setProject(contextToProject(ctx, q))
        setIssues(issuesToQSIssues(ctx.issues))
      })
      .catch((err) => setError(err instanceof QSMEApiError ? err.message : "Extraction failed"))
      .finally(() => setExtractingPageId(null))
  }, [project])

  const handleExtractSelected = useCallback(
    (pageIds: string[]) => {
      if (!project || USE_MOCK_DATA || pageIds.length === 0) return
      setExtracting(true)
      setError(null)
      setExtractDoneMessage(null)
      setExtractProgress(0)
      setExtractProgressMessage(`Extracting 1 of ${pageIds.length}…`)
      let done = 0
      const run = async () => {
        try {
          for (let i = 0; i < pageIds.length; i++) {
            setExtractProgressMessage(`Extracting ${i + 1} of ${pageIds.length}…`)
            await extractPage(pageIds[i], { force: false })
            done++
            setExtractProgress(Math.round((done / pageIds.length) * 100))
          }
          setExtractProgress(100)
          const [ctx, q] = await Promise.all([
            getProjectContext(project.id),
            getProjectQuantities(project.id).catch(() => null),
          ])
          setProject(contextToProject(ctx, q))
          setIssues(issuesToQSIssues(ctx.issues))
          setSelectedPageIds(new Set())
          setExtractDoneMessage(
            `Extraction complete — ${done} page${done !== 1 ? "s" : ""} ready`
          )
          setLeftSheetOpen(true)
          setTimeout(() => setExtractDoneMessage(null), 5000)
        } catch (err) {
          setError(err instanceof QSMEApiError ? err.message : "Extraction failed")
        } finally {
          setExtracting(false)
          setExtractProgress(0)
          setExtractProgressMessage("")
        }
      }
      run()
    },
    [project]
  )

  const onTogglePageSelection = useCallback((pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }, [])

  const onSelectAllPages = useCallback(() => {
    const pages = project?.files?.flatMap((f) => f.pages) ?? []
    setSelectedPageIds(new Set(pages.map((p) => p.id)))
  }, [project])

  const onClearPageSelection = useCallback(() => {
    setSelectedPageIds(new Set())
  }, [])

  const handleExport = useCallback(
    (format: "csv" | "xlsx" | "pdf") => {
      if (!project || USE_MOCK_DATA) return
      setExporting(true)
      setError(null)
      exportProject(project.id, format)
        .then((res) => {
          if (res.downloadUri) window.open(res.downloadUri, "_blank")
        })
        .catch((err) => {
          setError(err instanceof QSMEApiError ? err.message : "Export failed")
        })
        .finally(() => setExporting(false))
    },
    [project]
  )

  const handleSaveProjectName = useCallback(() => {
    const trimmed = (projectNameEditRef.current ?? "").trim()
    if (!project || USE_MOCK_DATA || trimmed === project.name || !trimmed) {
      setEditingProjectName(false)
      return
    }
    setError(null)
    updateProject(project.id, { name: trimmed })
      .then((updated) => {
        setProject((p) => (p ? { ...p, name: updated.name } : p))
        setEditingProjectName(false)
      })
      .catch((err) => setError(err instanceof QSMEApiError ? err.message : "Failed to rename project"))
  }, [project])

  useEffect(() => {
    if (editingProjectName) {
      setProjectNameEdit(project?.name ?? "")
      projectNameInputRef.current?.focus()
    }
  }, [editingProjectName, project?.name])

  const [zoom, setZoom] = useState(1)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set())
  const [scrollToPageId, setScrollToPageId] = useState<string | null>(null)
  const [selectedDimensionId, setSelectedDimensionId] = useState<string | null>(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [highlightBlockBbox, setHighlightBlockBbox] = useState<[number, number, number, number] | null>(null)

  const allPages = project?.files?.flatMap((f) => f.pages) ?? []
  const effectivePageId =
    selectedPageId && allPages.some((p) => p.id === selectedPageId)
      ? selectedPageId
      : allPages.length > 0
        ? allPages[0].id
        : null

  // Clear block highlight when selected page changes
  useEffect(() => {
    setHighlightBlockBbox(null)
  }, [effectivePageId])

  // Keyboard shortcut: E to extract current page when it needs extraction
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "e" && e.key !== "E") return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!project || USE_MOCK_DATA || !effectivePageId) return
      const page = allPages.find((p) => p.id === effectivePageId)
      if (!page || page.textContent || (page.structuredContent?.length ?? 0) > 0) return
      e.preventDefault()
      handleExtractCurrentPage(effectivePageId, false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [project, effectivePageId, allPages, handleExtractCurrentPage])
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [leftSheetOpen, setLeftSheetOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          {error && (
            <p className="text-sm text-destructive mb-2 flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
          <h1 className="text-xl font-bold text-foreground mb-2">Project Not Found</h1>
          <Link href="/projects" className="text-sm text-primary underline">
            Back to Projects
          </Link>
        </div>
      </main>
    )
  }

  const selectedPage = allPages.find((p) => p.id === effectivePageId) || null

  const sc = STATUS_CONFIG[project.status]

  return (
    <TooltipProvider>
      <main className="h-screen flex flex-col bg-background overflow-hidden">
        {/* hidden file input for header "Upload PDF" button */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,application/pdf"
          className="sr-only"
          aria-label="Upload PDF file"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        {/* header - mobile: hamburger + title + Save + more menu; desktop: full actions */}
        <header className="border-b border-border px-3 sm:px-4 py-2 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Mobile: hamburger opens left sidebar */}
            <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 lg:hidden h-11 w-11"
                  aria-label="Open project menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:max-w-[85vw] p-0 flex flex-col overflow-hidden">
                <SheetHeader className="p-3 border-b border-border shrink-0">
                  <SheetTitle className="text-sm font-semibold truncate">Project</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <ProjectLeftSidebarContent
                    project={project}
                    onFileSelect={handleFileUpload}
                    uploading={uploading}
                    onRunExtraction={handleRunExtraction}
                    onExtractPage={(id) => handleExtractCurrentPage(id, false)}
                    onExtractSelected={handleExtractSelected}
                    extracting={extracting}
                    pages={allPages}
                    selectedPageId={effectivePageId}
                    selectedPageIds={selectedPageIds}
                    onSelectPage={(pageId) => handleSelectPageForScroll(pageId, setSelectedPageId, setScrollToPageId)}
                    onTogglePage={onTogglePageSelection}
                    onSelectAll={onSelectAllPages}
                    onClearSelection={onClearPageSelection}
                    pageImageBaseUrl={!USE_MOCK_DATA ? getBaseUrl() : undefined}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-1.5 min-w-0">
              <Link
                href="/"
                className="text-xs sm:text-sm font-bold text-foreground tracking-tight shrink-0"
              >
                QSME
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Link
                href="/projects"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 text-xs sm:text-sm"
              >
                Projects
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {editingProjectName ? (
                <input
                  ref={projectNameInputRef}
                  type="text"
                  value={projectNameEdit}
                  onChange={(e) => setProjectNameEdit(e.target.value)}
                  onBlur={handleSaveProjectName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveProjectName()
                    if (e.key === "Escape") {
                      setProjectNameEdit(project.name)
                      setEditingProjectName(false)
                    }
                  }}
                  className="font-medium text-foreground text-xs sm:text-sm bg-transparent border-b border-primary px-0.5 py-0 min-w-[120px] max-w-[200px] focus:outline-none focus:ring-0"
                  aria-label="Project name"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => !USE_MOCK_DATA && setEditingProjectName(true)}
                  className="font-medium text-foreground truncate text-xs sm:text-sm text-left flex items-center gap-1 min-w-0 max-w-[180px] sm:max-w-[240px] hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
                  title="Click to rename"
                >
                  <span className="truncate">{project.name}</span>
                  {!USE_MOCK_DATA && <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />}
                </button>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] shrink-0 ml-1 sm:ml-2 ${sc.className}`}
              >
                {sc.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-11 min-h-[44px] px-3"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload PDF
            </Button>
            <span className="hidden md:inline text-[10px] text-muted-foreground mr-1">
              {saveStatus === "saved"
                ? "Saved"
                : saveStatus === "saving"
                ? "Saving..."
                : "Unsaved changes"}
            </span>
            {/* Desktop: all actions visible */}
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-11 min-w-[44px] px-3">
                <Share2 className="h-4 w-4 md:mr-1" />
                <span className="hidden lg:inline">Share</span>
              </Button>
              <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-11 min-w-[44px] px-3"
              onClick={() => handleExport("xlsx")}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="h-4 w-4 md:mr-1 animate-spin" /> : <Download className="h-4 w-4 md:mr-1" />}
              <span className="hidden lg:inline">Export</span>
            </Button>
              <Link href={`/projects/${project.id}/summary`}>
                <Button size="sm" variant="outline" className="text-xs h-11 min-h-[44px] px-3">
                  QS Summary
                </Button>
              </Link>
            </div>
            <Button
              size="sm"
              className="text-xs h-11 min-h-[44px] px-3"
              onClick={() => {
                setSaveStatus("saving")
                setTimeout(() => setSaveStatus("saved"), 1200)
              }}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            {/* Mobile: secondary actions in dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-11 w-11" aria-label="More actions">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload PDF
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button className="flex items-center gap-2 w-full cursor-pointer">
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <button
                    className="flex items-center gap-2 w-full cursor-pointer"
                    onClick={() => handleExport("xlsx")}
                    disabled={exporting}
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export (XLSX)
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${project.id}/summary`} className="flex items-center gap-2 w-full">
                    QS Summary
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Upload processing bar — visible while document is uploading */}
        {uploading && (
          <div className="shrink-0 px-3 sm:px-4 py-2 bg-primary/5 border-b border-primary/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              <span className="text-sm font-medium text-foreground">{uploadStatusMessage}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {uploadStatusMessage.includes("Preparing")
                ? "Rendering PDF pages. This may take a moment for large files."
                : "Saving PDF. Then page images will be prepared."}
            </p>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Extraction processing bar — visible when Run Extraction is running */}
        {extracting && (
          <div className="shrink-0 px-3 sm:px-4 py-2 bg-primary/5 border-b border-primary/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              <span className="text-sm font-medium text-foreground">
                {extractProgressMessage || "Extracting text and pages…"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">This may take a moment. Do not close the page.</p>
            <Progress value={extractProgress} className="h-2" />
          </div>
        )}

        {/* Success message after upload */}
        {uploadDoneMessage && !uploading && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-chart-2/10 border-b border-chart-2/30 text-sm text-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0" />
              {uploadDoneMessage}
            </span>
          </div>
        )}

        {/* Success message after extraction */}
        {extractDoneMessage && !extracting && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-chart-2/10 border-b border-chart-2/30 text-sm text-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0" />
              {extractDoneMessage}
            </span>
          </div>
        )}

        {error && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/30 text-sm text-destructive">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-destructive/80 hover:text-destructive underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* left sidebar - desktop only; mobile uses Sheet */}
          <aside className="hidden lg:flex lg:w-56 border-r border-border flex-col shrink-0 overflow-hidden">
            <ProjectLeftSidebarContent
              project={project}
              onFileSelect={handleFileUpload}
              uploading={uploading}
              onRunExtraction={handleRunExtraction}
              onExtractPage={(id) => handleExtractCurrentPage(id, false)}
              onExtractSelected={handleExtractSelected}
              extracting={extracting}
              pages={allPages}
              selectedPageId={effectivePageId}
              selectedPageIds={selectedPageIds}
              onSelectPage={(pageId) => handleSelectPageForScroll(pageId, setSelectedPageId, setScrollToPageId)}
              onTogglePage={onTogglePageSelection}
              onSelectAll={onSelectAllPages}
              onClearSelection={onClearPageSelection}
              pageImageBaseUrl={!USE_MOCK_DATA ? getBaseUrl() : undefined}
            />
          </aside>

          {/* main: scrollable document + simple toolbar */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-w-0">
            <div className="order-1 lg:order-none flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
              {/* minimal toolbar: zoom + panel toggle */}
              <div className="border-b border-border px-2 sm:px-3 py-2 flex items-center gap-2 shrink-0 min-h-[44px]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground w-12 text-center shrink-0">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                  onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs text-muted-foreground shrink-0"
                  onClick={() => setZoom(1)}
                >
                  Fit
                </Button>
                {selectedPage && (
                  <span className="hidden sm:inline text-xs text-muted-foreground truncate ml-2">
                    Page {selectedPage.number}
                  </span>
                )}
                <div className="ml-auto shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={() => setRightPanelOpen((v) => !v)}
                    aria-label={rightPanelOpen ? "Hide panel" : "Show panel"}
                  >
                    {rightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <DocumentScrollView
                pages={allPages}
                zoom={zoom}
                pageImageBaseUrl={!USE_MOCK_DATA ? getBaseUrl() : undefined}
                onPageInView={setSelectedPageId}
                selectedPageId={effectivePageId}
                scrollToPageId={scrollToPageId}
                highlightBbox={highlightBlockBbox}
                highlightPageId={effectivePageId ?? undefined}
              />
            </div>

            {/* extraction panel */}
            {rightPanelOpen ? (
              <div className="order-3 lg:order-none w-full lg:w-96 border-t lg:border-l border-border shrink-0 overflow-hidden max-h-[50vh] lg:max-h-none flex flex-col">
                <ExtractionPanel
                  page={selectedPage}
                  issues={issues}
                  allPages={allPages}
                  onSelectDimension={(id) =>
                    setSelectedDimensionId(id === selectedDimensionId ? null : id)
                  }
                  onSelectAnnotation={(id) =>
                    setSelectedAnnotationId(id === selectedAnnotationId ? null : id)
                  }
                  selectedDimensionId={selectedDimensionId}
                  selectedAnnotationId={selectedAnnotationId}
                  onExtractPage={handleExtractCurrentPage}
                  extractingPageId={extractingPageId}
                  onLocateBlock={(bbox) => setHighlightBlockBbox(bbox)}
                  pageImageBaseUrl={!USE_MOCK_DATA ? getBaseUrl() : undefined}
                />
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRightPanelOpen(true)}
                    className="order-3 lg:order-none w-full lg:w-10 shrink-0 border-t lg:border-l border-border bg-muted/50 hover:bg-muted flex flex-col items-center justify-center gap-1 py-3 lg:py-4 transition-colors min-h-[44px] lg:min-h-0"
                    aria-label="Show extraction panel"
                  >
                    <PanelRightOpen className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                      Show
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  Show extraction panel
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm you want to delete this project. All documents, pages, and extraction data will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (!project || USE_MOCK_DATA) return
                setDeleting(true)
                setError(null)
                deleteProject(project.id)
                  .then(() => router.push("/projects"))
                  .catch((err) => {
                    setError(err instanceof QSMEApiError ? err.message : "Failed to delete project")
                    setDeleting(false)
                  })
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
