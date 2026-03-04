// QSME domain contracts for overlays, calibration, and quantity outputs.
// These types mirror the planned backend schema so frontend + API can stay aligned.

export type Id = string

export type UnitsLength = "mm" | "cm" | "m" | "in" | "ft"
export type UnitsArea = "mm2" | "cm2" | "m2" | "ft2"
export type QuantityUnit = UnitsLength | UnitsArea | "count" | "m3"

export type OverlaySource = "manual" | "auto" | "ai" | "imported"
export type ConfidenceMethod = "manual" | "computed" | "assumed" | "ai"

export interface Confidence {
  score: number
  reason?: string
}

export interface NormalizedPoint {
  x: number
  y: number
}

export interface NormalizedBBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface EvidenceAnchor {
  pageId: Id
  bbox?: NormalizedBBox
  points?: NormalizedPoint[]
  textSnippet?: string
  source: OverlaySource
  confidence?: Confidence
}

export type ScaleMethod = "none" | "title_block" | "calibration"

export interface PageScale {
  method: ScaleMethod
  metersPerNormX?: number
  metersPerNormY?: number
  declaredScaleText?: string
  units: UnitsLength
  calibrationLine?: [NormalizedPoint, NormalizedPoint]
  calibrationRealLengthM?: number
  confidence: Confidence
}

export type OverlayKind = "room" | "opening" | "symbol" | "measurement" | "note"

export interface OverlayBase {
  id: Id
  projectId: Id
  documentId: Id
  pageId: Id
  kind: OverlayKind
  source: OverlaySource
  createdAt: string
  updatedAt: string
  createdBy?: Id
  updatedBy?: Id
  locked: boolean
  hidden: boolean
  verified: boolean
  confidence: Confidence
  evidence: EvidenceAnchor[]
  tags: string[]
  meta: Record<string, unknown>
}

export type RoomType =
  | "bedroom"
  | "bathroom"
  | "kitchen"
  | "living"
  | "corridor"
  | "laundry"
  | "garage"
  | "storage"
  | "stairs"
  | "other"

export interface RoomOverlay extends OverlayBase {
  kind: "room"
  name: string
  roomType: RoomType
  level?: string
  unitRef?: string
  polygon: NormalizedPoint[]
  holes: NormalizedPoint[][]
  cachedAreaM2?: number
  cachedPerimeterM?: number
}

export type OpeningType = "door" | "window" | "opening" | "slider" | "garage_door"

export interface OpeningOverlay extends OverlayBase {
  kind: "opening"
  openingType: OpeningType
  bbox: NormalizedBBox
  widthM?: number
  heightM?: number
  roomId?: Id
  wallId?: Id
}

export type SymbolType =
  | "socket"
  | "switch"
  | "light"
  | "data"
  | "tv"
  | "smoke_alarm"
  | "plumbing_point"
  | "fixture"
  | "other"

export interface SymbolOverlay extends OverlayBase {
  kind: "symbol"
  symbolType: SymbolType
  position: NormalizedPoint
  rotationDeg: number
  sizeNorm: number
  roomId?: Id
  label?: string
}

export type MeasurementMethod = "scaled" | "manual" | "ocr" | "ai"

export interface MeasurementOverlay extends OverlayBase {
  kind: "measurement"
  start: NormalizedPoint
  end: NormalizedPoint
  method: MeasurementMethod
  valueM?: number
  displayUnits: UnitsLength
  label?: string
  roomId?: Id
}

export interface NoteOverlay extends OverlayBase {
  kind: "note"
  position: NormalizedPoint
  text: string
  category?: string
}

export type Overlay = RoomOverlay | OpeningOverlay | SymbolOverlay | MeasurementOverlay | NoteOverlay

export interface OverlayPatch {
  verified?: boolean
  hidden?: boolean
  locked?: boolean
  tags?: string[]
  meta?: Record<string, unknown>
  name?: string
  roomType?: RoomType
  level?: string
  unitRef?: string
  polygon?: NormalizedPoint[]
  holes?: NormalizedPoint[][]
  openingType?: OpeningType
  bbox?: NormalizedBBox
  widthM?: number
  heightM?: number
  roomId?: Id
  symbolType?: SymbolType
  position?: NormalizedPoint
  rotationDeg?: number
  sizeNorm?: number
  label?: string
  start?: NormalizedPoint
  end?: NormalizedPoint
  method?: MeasurementMethod
  valueM?: number
  displayUnits?: UnitsLength
  text?: string
  category?: string
}

export type Trade =
  | "general"
  | "finishes"
  | "skirting"
  | "painting"
  | "electrical"
  | "plumbing"
  | "concrete"

export type QuantityScope = "project" | "document" | "page" | "room" | "opening" | "symbol"

export interface QuantityValue {
  value: number
  unit: QuantityUnit
  confidence: Confidence
  method: ConfidenceMethod
  notes?: string
}

export interface QuantityItem {
  id: Id
  projectId: Id
  trade: Trade
  key: string
  scope: QuantityScope
  documentId?: Id
  pageId?: Id
  roomId?: Id
  overlayIds: Id[]
  result: QuantityValue
  evidence: EvidenceAnchor[]
  createdAt: string
  updatedAt: string
  version: number
}

export interface RoomQuantityBundle {
  roomId: Id
  roomName: string
  level?: string
  unitRef?: string
  floorAreaGross?: QuantityValue
  floorAreaNet?: QuantityValue
  perimeter?: QuantityValue
  skirtingLength?: QuantityValue
  wallAreaGross?: QuantityValue
  wallAreaNet?: QuantityValue
  extras: Record<string, QuantityValue>
}

export interface QuantityScheduleRow {
  trade: Trade
  item: string
  key: string
  value: number
  unit: QuantityUnit
  level?: string
  unitRef?: string
  roomName?: string
  overlayIds: Id[]
  confidence: Confidence
}

export interface ProjectQuantitiesResponse {
  projectId: Id
  generatedAt: string
  version: number
  rooms: RoomQuantityBundle[]
  scheduleRows: QuantityScheduleRow[]
  issues: string[]
}

export interface QuantityRulesProfile {
  profileName: string
  defaultWallHeightM: number
  subtractDoorsFromSkirting: boolean
  subtractWindowsFromSkirting: boolean
  defaultDoorWidthM: number
  defaultDoorHeightM: number
  defaultWindowHeightM: number
  ignoreRoomTypesForSkirting: RoomType[]
}

export interface QuantityEngineInput {
  projectId: Id
  documentId?: Id
  rules: QuantityRulesProfile
  scalesByPage: Record<Id, PageScale>
  overlayIds: Id[]
}
