/**
 * Types for QSME backend API responses.
 * Aligned with FastAPI routers and project_knowledge_hub.ProjectContext.
 */

export interface ApiProject {
  id: string
  name: string
  description: string | null
  createdAt: string
}

export interface ApiDocument {
  id: string
  projectId: string
  filename: string
  storageUri: string | null
  status: string
  createdAt: string
}

export interface ApiPage {
  id: string
  documentId: string
  pageNumber: number
  imageUrl: string | null
  detectedPageType: string | null
  textContent: string | null
  /** Structured extraction items from embedded text + PaddleOCR. */
  structuredContent?: StructuredExtractionItem[]
  pageScale?: Record<string, unknown>
  /** Extraction engine used: pp_structure_v3, paddle_basic, tesseract, pdf_text. */
  extractionSource?: string | null
}

/** Normalized bbox [x1,y1,x2,y2] 0-1 for highlighting on page image. */
export type NormalizedBbox = [number, number, number, number]

export type ExtractionRegionType =
  | "title_blocks"
  | "text_blocks"
  | "table_blocks"
  | "image_blocks"
  | "figure_blocks"
  | "note"
  | "drawing_area"

export type StructuredExtractionItem = {
  id?: string
  page_id: string
  page_number: number
  bbox: NormalizedBbox
  region_type: ExtractionRegionType
  source: "embedded_text" | "paddle_structure" | "ocr"
  confidence: number
  raw_text: string
  normalized_text: string
  table?: string[][]
  layout_label?: string
  title?: string
  headers?: string[]
  rows?: string[][]
  markdown?: string
  html?: string
  figureIndex?: number
  image_url?: string
}

export interface ApiOverlayBase {
  id: string
  projectId: string
  documentId: string
  pageId: string
  kind: string
  source: string
  version?: number
  confidence?: { score: number; reason?: string }
  geometry: Record<string, unknown>
  metadata: Record<string, unknown>
  updatedAt?: string
  verified?: boolean
  locked?: boolean
  hidden?: boolean
}

export interface ApiProjectContext {
  project: ApiProject
  documents: ApiDocument[]
  pages: ApiPage[]
  overlays: ApiOverlay[]
  quantities: ApiProjectQuantities | null
  issues: string[]
  exports: ApiExportJob[]
  contextVersion: number
  needsRecompute: boolean
}

export type ApiOverlay = ApiOverlayBase & {
  kind: "room" | "opening" | "symbol" | "measurement" | "note"
  geometry: Record<string, unknown> & {
    name?: string
    roomType?: string
    level?: string
    unitRef?: string
    polygon?: { x: number; y: number }[]
    holes?: { x: number; y: number }[][]
    cachedAreaM2?: number
    cachedPerimeterM?: number
    bbox?: { x1: number; y1: number; x2: number; y2: number }
    openingType?: string
    widthM?: number
    heightM?: number
    position?: { x: number; y: number }
    start?: { x: number; y: number }
    end?: { x: number; y: number }
    valueM?: number
    displayUnits?: string
    label?: string
    text?: string
    category?: string
    symbolType?: string
    rotationDeg?: number
    sizeNorm?: number
  }
}

export interface ApiRoomQuantityBundle {
  roomId: string
  roomName: string
  level?: string
  unitRef?: string
  floorAreaGross?: { value: number; unit: string; confidence?: { score: number } }
  floorAreaNet?: { value: number; unit: string }
  perimeter?: { value: number; unit: string }
  skirtingLength?: { value: number; unit: string }
  wallAreaGross?: { value: number; unit: string }
  wallAreaNet?: { value: number; unit: string }
  extras?: Record<string, { value: number; unit: string }>
}

export interface ApiQuantityScheduleRow {
  trade: string
  item: string
  key: string
  value: number
  unit: string
  level?: string
  unitRef?: string
  roomName?: string
  overlayIds: string[]
  confidence?: { score: number }
}

export interface ApiProjectQuantities {
  projectId: string
  generatedAt: string
  version: number
  rooms: ApiRoomQuantityBundle[]
  scheduleRows: ApiQuantityScheduleRow[]
  issues: string[]
}

export interface ApiExportJob {
  id: string
  projectId: string
  format: string
  status: string
  downloadUri: string | null
  createdAt: string
}

export interface ApiExportRequest {
  format: "csv" | "xlsx" | "pdf"
}

export interface ApiPageScaleRequest {
  method: "title_block" | "calibration"
  point1?: { x: number; y: number }
  point2?: { x: number; y: number }
  real_length_m?: number
  declared_scale_text?: string
}
