// ── QSME Data Models ──

export type ProjectStatus = "draft" | "processing" | "ready" | "error"
export type FileStatus = "queued" | "processing" | "ready" | "error"
export type PageStatus = "queued" | "processing" | "done" | "error"
export type Discipline = "architectural" | "electrical" | "plumbing" | "structural"
export type MeasurementUnit = "mm" | "cm" | "m" | "in" | "ft"
export type PageTag = "Floor Plan" | "Dimensions" | "Notes" | "Electrical" | "Plumbing" | "Section" | "Elevation"
export type RoomType = "bedroom" | "bathroom" | "kitchen" | "living" | "dining" | "storage" | "corridor" | "utility" | "office" | "reception" | "other"
export type NoteCategory = "General" | "Finishes" | "Doors/Windows" | "MEP"
export type DimensionType = "external" | "internal" | "openings"
export type AnnotationType = "circle" | "triangle" | "line" | "note" | "arrow" | "measurement"

// ── Core Models ──

export interface QSProject {
  id: string
  name: string
  client: string
  location: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  files: QSFile[]
  settings: ProjectSettings
  summary: QSSummary
}

export interface ProjectSettings {
  discipline: Discipline
  units: MeasurementUnit
  autoDetectScale: boolean
  ocrFallback: boolean
  processPerPage: boolean
}

export interface QSFile {
  id: string
  name: string
  status: FileStatus
  pages: QSPage[]
  uploadedAt: string
}

export interface QSPage {
  id: string
  number: number
  name: string
  imageUrl: string
  tags: PageTag[]
  status: PageStatus
  rooms: QSRoom[]
  dimensions: QSDimension[]
  notes: QSNote[]
  annotations: QSAnnotation[]
  scale: string | null
  confidence: number
}

export interface QSRoom {
  id: string
  name: string
  type: RoomType
  area: number
  perimeter: number
  level: string
  confidence: number
  sourcePage: number
  verified: boolean
}

export interface QSDimension {
  id: string
  label: string
  value: number
  units: MeasurementUnit
  type: DimensionType
  confidence: number
  sourcePage: number
  verified: boolean
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
}

export interface QSNote {
  id: string
  text: string
  category: NoteCategory
  confidence: number
  position: { x: number; y: number }
  sourcePage: number
}

export interface QSAnnotation {
  id: string
  type: AnnotationType
  position: { x: number; y: number }
  size: { width: number; height: number }
  label: string
  description: string
  createdBy: string
  createdAt: string
  sourcePage: number
}

// ── QS Summary ──

export interface QSSummary {
  totalUnits: number
  totalRooms: number
  totalBedrooms: number
  totalBathrooms: number
  totalKitchens: number
  totalLivingRooms: number
  totalStorageRooms: number
  totalCorridors: number
  totalUtilityRooms: number
  totalOffices: number
  totalReceptions: number
  totalOtherRooms: number
  totalArea: number
  totalPerimeter: number
  totalDimensions: number
  totalNotes: number
  electricalSockets: number
  lightPoints: number
  dataPoints: number
  waterPoints: number
  drainPoints: number
  doorCount: number
  windowCount: number
  totalAnnotations: number
  extractionConfidence: number
}

export interface QSIssue {
  id: string
  type: "low-confidence" | "scale-missing" | "labels-missing" | "ocr-failed"
  title: string
  description: string
  severity: "warning" | "error"
  page: number | null
  suggestedFix: string
}
