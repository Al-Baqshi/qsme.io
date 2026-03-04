"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MOCK_PROJECTS } from "@/lib/qsme-mock-data"
import type { ProjectStatus } from "@/lib/qsme-types"

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

  const filtered = MOCK_PROJECTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <main className="min-h-screen bg-background">
      {/* header */}
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
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* page title */}
        <div className="flex flex-col gap-1 mb-6">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload drawings, extract rooms and dimensions, export schedules.
          </p>
        </div>

        {/* filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects or clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
        </div>

        {/* project cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No projects found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((project) => {
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
                  {/* info */}
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-foreground truncate">
                        {project.name}
                      </h2>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${sc.className}`}
                      >
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

                  {/* QS summary mini */}
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

                  {/* arrow */}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 hidden sm:block" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
