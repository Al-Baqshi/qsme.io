/**
 * Adapter: ApiProjectContext (+ optional ApiProjectQuantities) → QSProject-like UI model.
 * Keeps existing QSProject, QSPage, QSRoom, etc. so UI components stay unchanged.
 */

import type { ApiProjectContext, ApiProjectQuantities, ApiOverlay, ApiPage } from "@/lib/qsme-api-types"
import type {
  QSProject,
  QSFile,
  QSPage,
  QSRoom,
  QSDimension,
  QSNote,
  QSAnnotation,
  QSSummary,
  QSIssue,
  ProjectStatus,
  FileStatus,
  PageStatus,
  PageTag,
  RoomType,
  DimensionType,
  NoteCategory,
  AnnotationType,
} from "@/lib/qsme-types"

const DEFAULT_SETTINGS: QSProject["settings"] = {
  discipline: "architectural",
  units: "m",
  autoDetectScale: true,
  ocrFallback: true,
  processPerPage: true,
}

const EMPTY_SUMMARY: QSSummary = {
  totalUnits: 0,
  totalRooms: 0,
  totalBedrooms: 0,
  totalBathrooms: 0,
  totalKitchens: 0,
  totalLivingRooms: 0,
  totalStorageRooms: 0,
  totalCorridors: 0,
  totalUtilityRooms: 0,
  totalOffices: 0,
  totalReceptions: 0,
  totalOtherRooms: 0,
  totalArea: 0,
  totalPerimeter: 0,
  totalDimensions: 0,
  totalNotes: 0,
  electricalSockets: 0,
  lightPoints: 0,
  dataPoints: 0,
  waterPoints: 0,
  drainPoints: 0,
  doorCount: 0,
  windowCount: 0,
  totalAnnotations: 0,
  extractionConfidence: 0,
}

function deriveProjectStatus(context: ApiProjectContext): ProjectStatus {
  if (context.documents.length === 0) return "draft"
  const statuses = new Set(context.documents.map((d) => d.status))
  if (statuses.has("processing") || statuses.has("uploaded")) return "processing"
  if (statuses.has("error")) return "error"
  return "ready"
}

function docStatusToFileStatus(s: string): FileStatus {
  if (s === "processing" || s === "uploaded") return "processing"
  if (s === "ready") return "ready"
  if (s === "error") return "error"
  return "queued"
}

function pageScaleToString(scale?: Record<string, unknown> | null): string | null {
  if (!scale || typeof scale !== "object") return null
  const declared = scale.declaredScaleText
  if (typeof declared === "string") return declared
  const mx = scale.metersPerNormX
  const my = scale.metersPerNormY
  if (typeof mx === "number" && mx > 0) return `1:${Math.round(1 / mx)}`
  return null
}

function detectedPageTypeToTags(detectedPageType: string | null): PageTag[] {
  if (!detectedPageType) return []
  const t = detectedPageType.toLowerCase()
  const tagMap: Record<string, PageTag> = {
    floor_plan: "Floor Plan",
    floorplan: "Floor Plan",
    elevation: "Elevation",
    section: "Section",
    site_plan: "Floor Plan",
    notes: "Notes",
    schedule: "Dimensions",
    electrical: "Electrical",
    plumbing: "Plumbing",
  }
  for (const [key, tag] of Object.entries(tagMap)) {
    if (t.includes(key)) return [tag]
  }
  return []
}

function overlayToRoom(o: ApiOverlay, pageNumber: number): QSRoom {
  const g = o.geometry
  const score = o.confidence?.score ?? 0.5
  const confidence = Math.round(score * 100)
  return {
    id: o.id,
    name: (g.name as string) ?? "Room",
    type: ((g.roomType as string) ?? "other") as RoomType,
    area: typeof g.cachedAreaM2 === "number" ? g.cachedAreaM2 : 0,
    perimeter: typeof g.cachedPerimeterM === "number" ? g.cachedPerimeterM : 0,
    level: (g.level as string) ?? "",
    confidence,
    sourcePage: pageNumber,
    verified: o.verified ?? false,
  }
}

function overlayToDimension(o: ApiOverlay, pageNumber: number): QSDimension {
  const g = o.geometry
  const start = g.start ?? { x: 0, y: 0 }
  const end = g.end ?? { x: 0, y: 0 }
  const value = typeof g.valueM === "number" ? g.valueM : 0
  const units = (g.displayUnits as "m" | "mm" | "cm" | "in" | "ft") ?? "m"
  const score = o.confidence?.score ?? 0.5
  return {
    id: o.id,
    label: (g.label as string) ?? "Dimension",
    value,
    units,
    type: "internal" as DimensionType,
    confidence: Math.round(score * 100),
    sourcePage: pageNumber,
    verified: o.verified ?? false,
    startPoint: { x: (start as { x: number }).x ?? 0, y: (start as { y: number }).y ?? 0 },
    endPoint: { x: (end as { x: number }).x ?? 0, y: (end as { y: number }).y ?? 0 },
  }
}

function overlayToNote(o: ApiOverlay, pageNumber: number): QSNote {
  const g = o.geometry
  const pos = g.position ?? { x: 0, y: 0 }
  const score = o.confidence?.score ?? 0.5
  return {
    id: o.id,
    text: (g.text as string) ?? "",
    category: ((g.category as string) ?? "General") as NoteCategory,
    confidence: Math.round(score * 100),
    position: { x: (pos as { x: number }).x ?? 0, y: (pos as { y: number }).y ?? 0 },
    sourcePage: pageNumber,
  }
}

function overlayToAnnotation(o: ApiOverlay, pageNumber: number): QSAnnotation {
  const g = o.geometry
  const pos = g.position ?? { x: 0, y: 0 }
  const sizeNorm = typeof g.sizeNorm === "number" ? g.sizeNorm : 0.02
  const size = Math.round(sizeNorm * 500) || 20
  const symbolType = (g.symbolType as string) ?? "other"
  const typeMap: Record<string, AnnotationType> = {
    socket: "circle",
    switch: "circle",
    light: "triangle",
    data: "circle",
    tv: "circle",
    other: "circle",
  }
  return {
    id: o.id,
    type: typeMap[symbolType] ?? "circle",
    position: { x: (pos as { x: number }).x ?? 0, y: (pos as { y: number }).y ?? 0 },
    size: { width: size, height: size },
    label: (g.label as string) ?? "",
    description: "",
    createdBy: "System",
    createdAt: (o.updatedAt as string) ?? new Date().toISOString(),
    sourcePage: pageNumber,
  }
}

function pageToQSPage(
  apiPage: ApiPage,
  overlays: ApiOverlay[],
  docStatus: string
): QSPage {
  const pageOverlays = overlays.filter((o) => o.pageId === apiPage.id)
  const rooms = pageOverlays
    .filter((o) => o.kind === "room")
    .map((o) => overlayToRoom(o, apiPage.pageNumber))
  const dimensions = pageOverlays
    .filter((o) => o.kind === "measurement")
    .map((o) => overlayToDimension(o, apiPage.pageNumber))
  const notes = pageOverlays
    .filter((o) => o.kind === "note")
    .map((o) => overlayToNote(o, apiPage.pageNumber))
  const annotations = pageOverlays
    .filter((o) => o.kind === "symbol")
    .map((o) => overlayToAnnotation(o, apiPage.pageNumber))

  const tags = detectedPageTypeToTags(apiPage.detectedPageType)
  if (tags.length === 0 && (rooms.length > 0 || dimensions.length > 0)) tags.push("Floor Plan", "Dimensions")

  let pageStatus: PageStatus = "done"
  if (docStatus === "processing" || docStatus === "uploaded") pageStatus = "processing"
  else if (docStatus === "error") pageStatus = "error"

  const avgConfidence =
    [...rooms, ...dimensions, ...notes].length > 0
      ? Math.round(
          [...rooms, ...dimensions, ...notes].reduce((s, x) => s + x.confidence, 0) /
            [...rooms, ...dimensions, ...notes].length
        )
      : 85

  return {
    id: apiPage.id,
    number: apiPage.pageNumber,
    name: `Page ${apiPage.pageNumber}`,
    imageUrl: apiPage.imageUrl ?? "",
    textContent: apiPage.textContent ?? null,
    structuredContent: apiPage.structuredContent ?? [],
    extractionSource: apiPage.extractionSource ?? null,
    tags,
    status: pageStatus,
    rooms,
    dimensions,
    notes,
    annotations,
    scale: pageScaleToString(apiPage.pageScale) ?? null,
    confidence: avgConfidence,
  }
}

function buildSummaryFromQuantities(
  quantities: ApiProjectQuantities,
  allRooms: QSRoom[],
  allDimensions: QSDimension[],
  allNotes: QSNote[],
  allAnnotations: QSAnnotation[]
): QSSummary {
  const rooms = quantities.rooms ?? []
  const totalArea = rooms.reduce(
    (sum, r) => sum + (r.floorAreaGross?.value ?? r.floorAreaNet?.value ?? 0),
    0
  )
  const totalPerimeter = rooms.reduce(
    (sum, r) => sum + (r.perimeter?.value ?? 0),
    0
  )
  const countRoomType = (type: string) =>
    allRooms.filter((r) => r.type === type).length
  const schedule = quantities.scheduleRows ?? []
  const sockets = schedule.filter(
    (r) => r.item?.toLowerCase().includes("socket") || r.trade === "electrical"
  ).length
  const lights = schedule.filter(
    (r) => r.item?.toLowerCase().includes("light")
  ).length
  const doors = schedule.filter(
    (r) => r.item?.toLowerCase().includes("door")
  ).length
  const windows = schedule.filter(
    (r) => r.item?.toLowerCase().includes("window")
  ).length

  const extractionConfidence = quantities.issues?.length
    ? Math.max(0, 90 - quantities.issues.length * 5)
    : 90

  return {
    totalUnits: 1,
    totalRooms: allRooms.length,
    totalBedrooms: countRoomType("bedroom"),
    totalBathrooms: countRoomType("bathroom"),
    totalKitchens: countRoomType("kitchen"),
    totalLivingRooms: countRoomType("living"),
    totalStorageRooms: countRoomType("storage"),
    totalCorridors: countRoomType("corridor"),
    totalUtilityRooms: countRoomType("utility"),
    totalOffices: countRoomType("office"),
    totalReceptions: countRoomType("reception"),
    totalOtherRooms: countRoomType("other"),
    totalArea,
    totalPerimeter,
    totalDimensions: allDimensions.length,
    totalNotes: allNotes.length,
    electricalSockets: sockets || 0,
    lightPoints: lights || 0,
    dataPoints: 0,
    waterPoints: 0,
    drainPoints: 0,
    doorCount: doors || 0,
    windowCount: windows || 0,
    totalAnnotations: allAnnotations.length,
    extractionConfidence,
  }
}

/**
 * Convert API project context (and optional quantities) to QSProject for the UI.
 */
export function contextToProject(
  context: ApiProjectContext,
  quantities?: ApiProjectQuantities | null
): QSProject {
  const status = deriveProjectStatus(context)
  const project = context.project
  const createdAt =
    typeof project.createdAt === "string"
      ? project.createdAt
      : new Date(project.createdAt as unknown as number).toISOString()

  const files: QSFile[] = context.documents.map((doc) => {
    const docPages = context.pages.filter((p) => p.documentId === doc.id)
    const pages: QSPage[] = docPages.map((p) =>
      pageToQSPage(p, context.overlays, doc.status)
    )
    return {
      id: doc.id,
      name: doc.filename,
      status: docStatusToFileStatus(doc.status),
      pages,
      uploadedAt: doc.createdAt,
    }
  })

  const allRooms = files.flatMap((f) => f.pages.flatMap((p) => p.rooms))
  const allDimensions = files.flatMap((f) => f.pages.flatMap((p) => p.dimensions))
  const allNotes = files.flatMap((f) => f.pages.flatMap((p) => p.notes))
  const allAnnotations = files.flatMap((f) =>
    f.pages.flatMap((p) => p.annotations)
  )

  const summary =
    quantities != null
      ? buildSummaryFromQuantities(
          quantities,
          allRooms,
          allDimensions,
          allNotes,
          allAnnotations
        )
      : EMPTY_SUMMARY

  return {
    id: project.id,
    name: project.name,
    client: "", // backend has no client
    location: "", // backend has no location
    status,
    createdAt,
    updatedAt: createdAt,
    files,
    settings: DEFAULT_SETTINGS,
    summary,
  }
}

/**
 * Map backend issues (list of strings) to QSIssue[].
 */
export function issuesToQSIssues(issues: string[]): QSIssue[] {
  return issues.map((description, i) => ({
    id: `issue-${i}`,
    type: "labels-missing",
    title: "Issue",
    description,
    severity: "warning" as const,
    page: null,
    suggestedFix: "Review extraction and overlays.",
  }))
}
