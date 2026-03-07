"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  FolderOpen,
  ArrowRight,
  Building2,
  MapPin,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MOCK_PROJECTS } from "@/lib/qsme-mock-data"
import { getProjects, createProject, deleteProject, QSMEApiError } from "@/lib/qsme-api"
import type { ApiProject } from "@/lib/qsme-api-types"
import type { QSProject, ProjectStatus } from "@/lib/qsme-types"

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "bg-muted text-muted-foreground border-border",
  },
  processing: {
    label: "Processing",
    className:
      "bg-chart-4/15 text-chart-4 border-chart-4/30",
  },
  ready: {
    label: "Ready",
    className:
      "bg-chart-2/15 text-chart-2 border-chart-2/30",
  },
  error: {
    label: "Error",
    className:
      "bg-destructive/15 text-destructive border-destructive/30",
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [apiProjects, setApiProjects] = useState<ApiProject[]>([])
  const [loading, setLoading] = useState(!USE_MOCK_DATA)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (USE_MOCK_DATA) return
    let cancelled = false
    setError(null)
    setLoading(true)
    getProjects()
      .then((list) => {
        if (!cancelled) setApiProjects(list)
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof QSMEApiError ? err.message : "Failed to load projects")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleNewProject = () => {
    if (USE_MOCK_DATA) return
    setCreating(true)
    setError(null)
    createProject({ name: "New Project", description: null })
      .then((p) => {
        window.location.href = `/projects/${p.id}`
      })
      .catch((err) => {
        setError(err instanceof QSMEApiError ? err.message : "Failed to create project")
        setCreating(false)
      })
  }

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteConfirmId(projectId)
  }

  const confirmDeleteProject = () => {
    if (!deleteConfirmId || USE_MOCK_DATA) return
    setDeleting(true)
    setError(null)
    deleteProject(deleteConfirmId)
      .then(() => {
        setApiProjects((prev) => prev.filter((p) => p.id !== deleteConfirmId))
        setDeleteConfirmId(null)
      })
      .catch((err) => {
        setError(err instanceof QSMEApiError ? err.message : "Failed to delete project")
      })
      .finally(() => setDeleting(false))
  }

  const filteredMock = MOCK_PROJECTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredApi = apiProjects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  const useApi = !USE_MOCK_DATA
  const filtered = useApi ? filteredApi : filteredMock
  const showStatusFilter = !useApi

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-bold text-foreground tracking-tight"
          >
            QSME
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-sm font-medium text-foreground">Projects</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tool">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
              Circle Tool
            </Button>
          </Link>
          <Button size="sm" onClick={handleNewProject} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            New Project
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-1 mb-6">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload drawings, extract rooms and dimensions, export schedules.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={useApi ? "Search projects..." : "Search projects or clients..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {showStatusFilter && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No projects found</p>
          </div>
        ) : useApi ? (
          <div className="flex flex-col gap-3">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="group border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-foreground/20 transition-colors bg-card relative"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="flex-1 flex flex-col gap-1.5 min-w-0 absolute inset-0 z-0"
                  aria-label={`Open ${project.name}`}
                />
                <div className="flex-1 flex flex-col gap-1.5 min-w-0 relative z-10 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground truncate">
                      {project.name}
                    </h2>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_CONFIG.draft.className}`}>
                      Draft
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {project.description && (
                      <span className="line-clamp-1">{project.description}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(project.createdAt)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 relative z-10 text-muted-foreground hover:text-destructive h-9 w-9"
                  onClick={(e) => handleDeleteProject(e, project.id)}
                  aria-label="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 hidden sm:block relative z-10 pointer-events-none" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(filtered as QSProject[]).map((project) => {
              const sc = STATUS_CONFIG[project.status]
              const totalPages = project.files.reduce(
                (sum, f) => sum + f.pages.length,
                0
              )
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-foreground/20 transition-colors bg-card"
                >
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-foreground truncate">
                        {project.name}
                      </h2>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${sc.className}`}>
                        {sc.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {project.client}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {project.files.length} file{project.files.length !== 1 ? "s" : ""}, {totalPages} page{totalPages !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(project.updatedAt)}
                      </span>
                    </div>
                  </div>
                  {project.summary.totalRooms > 0 && (
                    <div className="hidden md:flex items-center gap-3 text-xs">
                      <div className="flex flex-col items-center px-3 py-1.5 rounded-md bg-muted/50">
                        <span className="font-mono font-bold text-foreground text-sm">
                          {project.summary.totalRooms}
                        </span>
                        <span className="text-muted-foreground text-[10px]">Rooms</span>
                      </div>
                      <div className="flex flex-col items-center px-3 py-1.5 rounded-md bg-muted/50">
                        <span className="font-mono font-bold text-foreground text-sm">
                          {project.summary.totalArea.toFixed(0)}
                        </span>
                        <span className="text-muted-foreground text-[10px]">m² Area</span>
                      </div>
                      <div className="flex flex-col items-center px-3 py-1.5 rounded-md bg-muted/50">
                        <span className="font-mono font-bold text-foreground text-sm">
                          {project.summary.extractionConfidence}%
                        </span>
                        <span className="text-muted-foreground text-[10px]">Confidence</span>
                      </div>
                    </div>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 hidden sm:block" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
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
                confirmDeleteProject()
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
