"use client"

import { use, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ChevronRight,
  ArrowLeft,
  Download,
  Home,
  BedDouble,
  Bath,
  CookingPot,
  Sofa,
  DoorOpen,
  Maximize,
  Plug,
  Lightbulb,
  Wifi,
  Droplets,
  PipetteIcon,
  LayoutGrid,
  Ruler,
  StickyNote,
  Shield,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getProject } from "@/lib/qsme-mock-data"
import { getProjectContext, getProjectQuantities, exportProject, QSMEApiError } from "@/lib/qsme-api"
import { contextToProject } from "@/lib/adapters/context-to-project"
import type { QSProject } from "@/lib/qsme-types"

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

export default function QSSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [project, setProject] = useState<QSProject | null>(USE_MOCK_DATA ? getProject(id) ?? null : null)
  const [loading, setLoading] = useState(!USE_MOCK_DATA)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (USE_MOCK_DATA) return
    setLoading(true)
    setError(null)
    Promise.all([getProjectContext(id), getProjectQuantities(id).catch(() => null)])
      .then(([ctx, quantities]) => {
        setProject(contextToProject(ctx, quantities))
      })
      .catch((err) => {
        setError(err instanceof QSMEApiError ? err.message : "Failed to load project")
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleExport = useCallback((format: "csv" | "pdf") => {
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
  }, [project])

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading summary...</p>
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

  const s = project.summary
  const allRooms = project.files.flatMap((f) => f.pages.flatMap((p) => p.rooms))
  const allDimensions = project.files.flatMap((f) => f.pages.flatMap((p) => p.dimensions))

  // Group rooms by level
  const roomsByLevel = allRooms.reduce<Record<string, typeof allRooms>>((acc, room) => {
    if (!acc[room.level]) acc[room.level] = []
    acc[room.level].push(room)
    return acc
  }, {})

  // Group rooms by type
  const roomsByType = allRooms.reduce<Record<string, number>>((acc, room) => {
    acc[room.type] = (acc[room.type] || 0) + 1
    return acc
  }, {})

  return (
    <main className="min-h-screen bg-background">
      {/* header */}
      <header className="border-b border-border px-4 py-2 flex items-center justify-between sticky top-0 bg-background z-10">
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <Link href="/" className="text-sm font-bold text-foreground tracking-tight shrink-0">
            QSME
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Link href={`/projects/${project.id}`} className="text-muted-foreground hover:text-foreground transition-colors truncate">
            {project.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground shrink-0">QS Summary</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => handleExport("csv")}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => handleExport("pdf")}
            disabled={exporting}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export PDF
          </Button>
          <Link href={`/projects/${project.id}`}>
            <Button variant="outline" size="sm" className="text-xs h-7">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to Workspace
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* title */}
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Quantity Survey Summary
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.name} -- {project.client} -- {project.location}
          </p>
        </div>

        {/* top-level KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <KPICard icon={Home} label="Total Units" value={s.totalUnits} />
          <KPICard icon={LayoutGrid} label="Total Rooms" value={s.totalRooms} />
          <KPICard icon={Maximize} label="Total Area" value={`${s.totalArea.toFixed(1)} m²`} />
          <KPICard icon={Ruler} label="Dimensions" value={s.totalDimensions} />
          <KPICard icon={StickyNote} label="Notes" value={s.totalNotes} />
          <KPICard icon={Shield} label="Confidence" value={`${s.extractionConfidence}%`} accent />
        </div>

        {/* confidence bar */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Overall Extraction Confidence</span>
              <span className="text-sm font-mono font-bold text-foreground">{s.extractionConfidence}%</span>
            </div>
            <Progress value={s.extractionConfidence} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Based on OCR accuracy, scale detection, and label recognition across {project.files.reduce((sum, f) => sum + f.pages.length, 0)} pages.
            </p>
          </CardContent>
        </Card>

        {/* room breakdown + MEP breakdown */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Room Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Room Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <RoomStatCard icon={BedDouble} label="Bedrooms" count={s.totalBedrooms} color="text-chart-1" />
                <RoomStatCard icon={Bath} label="Bathrooms" count={s.totalBathrooms} color="text-chart-2" />
                <RoomStatCard icon={CookingPot} label="Kitchens" count={s.totalKitchens} color="text-chart-3" />
                <RoomStatCard icon={Sofa} label="Living Rooms" count={s.totalLivingRooms} color="text-chart-4" />
                <RoomStatCard icon={DoorOpen} label="Corridors" count={s.totalCorridors} color="text-chart-5" />
                <RoomStatCard icon={Building2} label="Offices" count={s.totalOffices} color="text-muted-foreground" />
                <RoomStatCard icon={Home} label="Storage" count={s.totalStorageRooms} color="text-muted-foreground" />
                <RoomStatCard icon={Home} label="Reception" count={s.totalReceptions} color="text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* MEP Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">MEP / Fittings Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <MEPStatCard icon={Plug} label="Electrical Sockets" count={s.electricalSockets} />
                <MEPStatCard icon={Lightbulb} label="Light Points" count={s.lightPoints} />
                <MEPStatCard icon={Wifi} label="Data Points" count={s.dataPoints} />
                <MEPStatCard icon={Droplets} label="Water Points" count={s.waterPoints} />
                <MEPStatCard icon={PipetteIcon} label="Drain Points" count={s.drainPoints} />
                <MEPStatCard icon={DoorOpen} label="Doors" count={s.doorCount} />
                <MEPStatCard icon={Maximize} label="Windows" count={s.windowCount} />
                <MEPStatCard icon={LayoutGrid} label="Annotations" count={s.totalAnnotations} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Schedule by Level */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Room Schedule by Level</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {allRooms.length} rooms total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {Object.entries(roomsByLevel).map(([level, rooms]) => (
              <div key={level} className="mb-6 last:mb-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {level} Floor
                </h3>
                <div className="border border-border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs h-8">Room</TableHead>
                        <TableHead className="text-xs h-8">Type</TableHead>
                        <TableHead className="text-xs h-8 text-right">Area (m²)</TableHead>
                        <TableHead className="text-xs h-8 text-right">Perimeter (m)</TableHead>
                        <TableHead className="text-xs h-8 text-right">Confidence</TableHead>
                        <TableHead className="text-xs h-8 text-center">Verified</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rooms.map((room) => (
                        <TableRow key={room.id}>
                          <TableCell className="text-xs font-medium">{room.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
                              {room.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">{room.area.toFixed(1)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{room.perimeter.toFixed(1)}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                room.confidence >= 90
                                  ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
                                  : room.confidence >= 75
                                  ? "bg-chart-4/15 text-chart-4 border-chart-4/30"
                                  : "bg-destructive/15 text-destructive border-destructive/30"
                              }`}
                            >
                              {room.confidence}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {room.verified ? (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-chart-2/15 text-chart-2 border-chart-2/30">
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">--</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* level totals */}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell className="text-xs font-semibold" colSpan={2}>
                          {level} Floor Total ({rooms.length} rooms)
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold">
                          {rooms.reduce((sum, r) => sum + r.area, 0).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold">
                          {rooms.reduce((sum, r) => sum + r.perimeter, 0).toFixed(1)}
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}

            {/* grand total */}
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Grand Total</span>
              <div className="flex items-center gap-6 text-sm">
                <span>
                  <span className="font-mono font-bold text-foreground">{s.totalRooms}</span>{" "}
                  <span className="text-muted-foreground">rooms</span>
                </span>
                <span>
                  <span className="font-mono font-bold text-foreground">{s.totalArea.toFixed(1)}</span>{" "}
                  <span className="text-muted-foreground">m² area</span>
                </span>
                <span>
                  <span className="font-mono font-bold text-foreground">{s.totalPerimeter.toFixed(1)}</span>{" "}
                  <span className="text-muted-foreground">m perimeter</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dimensions Schedule */}
        {allDimensions.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Dimensions Schedule</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {allDimensions.length} dimensions
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8">Label</TableHead>
                      <TableHead className="text-xs h-8 text-right">Value</TableHead>
                      <TableHead className="text-xs h-8">Units</TableHead>
                      <TableHead className="text-xs h-8">Type</TableHead>
                      <TableHead className="text-xs h-8 text-right">Page</TableHead>
                      <TableHead className="text-xs h-8 text-right">Confidence</TableHead>
                      <TableHead className="text-xs h-8 text-center">Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDimensions.map((dim) => (
                      <TableRow key={dim.id}>
                        <TableCell className="text-xs font-medium">{dim.label}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{dim.value}</TableCell>
                        <TableCell className="text-xs">{dim.units}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
                            {dim.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right">{dim.sourcePage}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              dim.confidence >= 90
                                ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
                                : dim.confidence >= 75
                                ? "bg-chart-4/15 text-chart-4 border-chart-4/30"
                                : "bg-destructive/15 text-destructive border-destructive/30"
                            }`}
                          >
                            {dim.confidence}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {dim.verified ? (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-chart-2/15 text-chart-2 border-chart-2/30">
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">--</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

// ── Sub-components ──

function KPICard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <span className={`text-xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}>
          {value}
        </span>
      </CardContent>
    </Card>
  )
}

function RoomStatCard({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  color: string
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-card">
      <Icon className={`h-4 w-4 ${color}`} />
      <div className="flex flex-col">
        <span className="text-sm font-mono font-bold text-foreground">{count}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function MEPStatCard({
  icon: Icon,
  label,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-card">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-sm font-mono font-bold text-foreground">{count}</span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
