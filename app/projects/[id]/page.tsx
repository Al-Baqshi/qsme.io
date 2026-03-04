"use client"

import { useState, use } from "react"
import Link from "next/link"
import {
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Circle,
  Triangle,
  Minus,
  Ruler,
  Type,
  ArrowUpRight,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Share2,
  Save,
  Upload,
  Play,
  Settings2,
  FileText,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { DrawingViewer } from "@/components/qsme/drawing-viewer"
import { PageNavigator } from "@/components/qsme/page-navigator"
import { ExtractionPanel } from "@/components/qsme/extraction-panel"
import { getProject } from "@/lib/qsme-mock-data"
import { MOCK_ISSUES } from "@/lib/qsme-mock-data"
import type { ProjectStatus } from "@/lib/qsme-types"

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  processing: { label: "Processing", className: "bg-chart-4/15 text-chart-4 border-chart-4/30" },
  ready: { label: "Ready", className: "bg-chart-2/15 text-chart-2 border-chart-2/30" },
  error: { label: "Error", className: "bg-destructive/15 text-destructive border-destructive/30" },
}

const TOOLS = [
  { id: "pan", icon: Hand, label: "Pan" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "triangle", icon: Triangle, label: "Triangle" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "measure", icon: Ruler, label: "Measure" },
  { id: "text", icon: Type, label: "Text" },
  { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
  { id: "delete", icon: Trash2, label: "Delete" },
]

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const project = getProject(id)

  const [activeTool, setActiveTool] = useState("pan")
  const [zoom, setZoom] = useState(1)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [selectedDimensionId, setSelectedDimensionId] = useState<string | null>(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  if (!project) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Project Not Found</h1>
          <Link href="/projects" className="text-sm text-primary underline">
            Back to Projects
          </Link>
        </div>
      </main>
    )
  }

  const allPages = project.files.flatMap((f) => f.pages)
  const effectivePageId = selectedPageId && allPages.some((p) => p.id === selectedPageId)
    ? selectedPageId
    : allPages.length > 0
    ? allPages[0].id
    : null
  const selectedPage = allPages.find((p) => p.id === effectivePageId) || null

  const sc = STATUS_CONFIG[project.status]

  return (
    <TooltipProvider>
      <main className="h-screen flex flex-col bg-background overflow-hidden">
        {/* header */}
        <header className="border-b border-border px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <Link
              href="/"
              className="text-sm font-bold text-foreground tracking-tight shrink-0"
            >
              QSME
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Projects
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground truncate">
              {project.name}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ml-2 ${sc.className}`}
            >
              {sc.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground mr-2">
              {saveStatus === "saved"
                ? "Saved"
                : saveStatus === "saving"
                ? "Saving..."
                : "Unsaved changes"}
            </span>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
              <Share2 className="h-3.5 w-3.5 mr-1" />
              Share
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
            <Link href={`/projects/${project.id}/summary`}>
              <Button size="sm" variant="outline" className="text-xs h-7">
                QS Summary
              </Button>
            </Link>
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                setSaveStatus("saving")
                setTimeout(() => setSaveStatus("saved"), 1200)
              }}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Save
            </Button>
          </div>
        </header>

        {/* body */}
        <div className="flex-1 flex overflow-hidden">
          {/* left sidebar - project info & files */}
          <aside className="w-56 border-r border-border flex flex-col shrink-0 overflow-hidden">
            {/* project info */}
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

            {/* upload */}
            <div className="p-3 border-b border-border">
              <div className="border-2 border-dashed border-border rounded-md p-3 flex flex-col items-center gap-1 hover:border-foreground/20 transition-colors cursor-pointer">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Drop PDFs here</span>
              </div>
            </div>

            {/* files */}
            <div className="p-3 border-b border-border">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Files
              </h2>
              <div className="flex flex-col gap-1.5">
                {project.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 text-xs p-1.5 rounded-md border border-border bg-card"
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
              <Button size="sm" className="w-full mt-2 text-xs h-7">
                <Play className="h-3 w-3 mr-1" />
                Run Extraction
              </Button>
            </div>

            {/* settings */}
            <Accordion type="single" collapsible className="px-3">
              <AccordionItem value="settings" className="border-b-0">
                <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2 hover:no-underline">
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
                        <SelectTrigger className="h-7 text-xs">
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
                        <SelectTrigger className="h-7 text-xs">
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
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground">Auto-detect scale</Label>
                      <Switch defaultChecked={project.settings.autoDetectScale} className="scale-75" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground">OCR fallback</Label>
                      <Switch defaultChecked={project.settings.ocrFallback} className="scale-75" />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </aside>

          {/* main workspace - 3 column */}
          <div className="flex-1 flex overflow-hidden">
            {/* page navigator */}
            <div className="w-36 border-r border-border shrink-0 overflow-hidden">
              <PageNavigator
                pages={allPages}
                selectedPageId={selectedPage?.id || null}
                onSelectPage={setSelectedPageId}
              />
            </div>

            {/* drawing viewer */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* toolbar */}
              <div className="border-b border-border px-3 py-1.5 flex items-center gap-1 shrink-0 flex-wrap">
                {/* annotation tools */}
                {TOOLS.map((tool) => (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeTool === tool.id ? "secondary" : "ghost"}
                        size="sm"
                        className={`h-7 w-7 p-0 ${activeTool === tool.id ? "" : "text-muted-foreground"}`}
                        onClick={() => setActiveTool(tool.id)}
                      >
                        <tool.icon className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {tool.label}
                    </TooltipContent>
                  </Tooltip>
                ))}

                <Separator orientation="vertical" className="h-5 mx-1" />

                {/* undo/redo */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Undo</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                      <Redo2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Redo</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-5 mx-1" />

                {/* zoom controls */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))}
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Zoom Out</TooltipContent>
                </Tooltip>
                <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setZoom((z) => Math.min(4, z + 0.15))}
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Zoom In</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setZoom(1)}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Fit to Screen</TooltipContent>
                </Tooltip>

                {/* page info */}
                {selectedPage && (
                  <>
                    <Separator orientation="vertical" className="h-5 mx-1" />
                    <span className="text-[10px] text-muted-foreground">
                      Page {selectedPage.number}: {selectedPage.name}
                    </span>
                    {selectedPage.scale && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-1">
                        {selectedPage.scale}
                      </Badge>
                    )}
                  </>
                )}

                {/* right panel toggle - pushed to far right */}
                <div className="ml-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => setRightPanelOpen((v) => !v)}
                      >
                        {rightPanelOpen ? (
                          <PanelRightClose className="h-3.5 w-3.5" />
                        ) : (
                          <PanelRightOpen className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {rightPanelOpen ? "Hide extraction panel" : "Show extraction panel"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* canvas */}
              <div className="flex-1 p-2 overflow-hidden">
                <DrawingViewer
                  page={selectedPage}
                  zoom={zoom}
                  activeTool={activeTool}
                  selectedAnnotationId={selectedAnnotationId}
                  selectedDimensionId={selectedDimensionId}
                  onAnnotationClick={setSelectedAnnotationId}
                />
              </div>
            </div>

            {/* extraction results panel */}
            {rightPanelOpen && (
              <div className="w-72 border-l border-border shrink-0 overflow-hidden">
                <ExtractionPanel
                  page={selectedPage}
                  issues={MOCK_ISSUES}
                  onSelectDimension={(id) =>
                    setSelectedDimensionId(id === selectedDimensionId ? null : id)
                  }
                  onSelectAnnotation={(id) =>
                    setSelectedAnnotationId(id === selectedAnnotationId ? null : id)
                  }
                  selectedDimensionId={selectedDimensionId}
                  selectedAnnotationId={selectedAnnotationId}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </TooltipProvider>
  )
}
