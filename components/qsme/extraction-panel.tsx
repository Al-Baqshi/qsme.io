"use client"

import type { QSPage, QSRoom, QSDimension, QSNote, QSAnnotation } from "@/lib/qsme-types"
import type { QSIssue } from "@/lib/qsme-types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  CheckCircle2,
  XCircle,
  Edit3,
  AlertTriangle,
  MapPin,
  Plus,
} from "lucide-react"

interface ExtractionPanelProps {
  page: QSPage | null
  issues: QSIssue[]
  onSelectDimension: (id: string) => void
  onSelectAnnotation: (id: string) => void
  selectedDimensionId: string | null
  selectedAnnotationId: string | null
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 90
      ? "bg-chart-2/15 text-chart-2 border-chart-2/30"
      : value >= 75
      ? "bg-chart-4/15 text-chart-4 border-chart-4/30"
      : "bg-destructive/15 text-destructive border-destructive/30"

  return (
    <Badge variant="outline" className={`text-[10px] ${color}`}>
      {value}%
    </Badge>
  )
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  kitchen: "Kitchen",
  living: "Living",
  dining: "Dining",
  storage: "Storage",
  corridor: "Corridor",
  utility: "Utility",
  office: "Office",
  reception: "Reception",
  other: "Other",
}

export function ExtractionPanel({
  page,
  issues,
  onSelectDimension,
  onSelectAnnotation,
  selectedDimensionId,
  selectedAnnotationId,
}: ExtractionPanelProps) {
  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-muted-foreground">Select a page to view extraction results</p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="rooms" className="h-full flex flex-col">
      <TabsList className="w-full shrink-0 justify-start rounded-none border-b border-border bg-transparent px-2 gap-0">
        <TabsTrigger value="rooms" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
          Rooms ({page.rooms.length})
        </TabsTrigger>
        <TabsTrigger value="dimensions" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
          Dims ({page.dimensions.length})
        </TabsTrigger>
        <TabsTrigger value="notes" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
          Notes ({page.notes.length})
        </TabsTrigger>
        <TabsTrigger value="issues" className="text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
          Issues ({issues.filter((i) => i.page === page.number || i.page === null).length})
        </TabsTrigger>
      </TabsList>

      {/* Rooms */}
      <TabsContent value="rooms" className="flex-1 m-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 flex flex-col gap-2">
            {page.rooms.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No rooms detected on this page</p>
            ) : (
              page.rooms.map((room) => (
                <RoomRow key={room.id} room={room} />
              ))
            )}
            <Button variant="outline" size="sm" className="w-full mt-1 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Room Manually
            </Button>
          </div>
        </ScrollArea>
      </TabsContent>

      {/* Dimensions */}
      <TabsContent value="dimensions" className="flex-1 m-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 flex flex-col gap-2">
            {page.dimensions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No dimensions detected on this page</p>
            ) : (
              page.dimensions.map((dim) => (
                <DimensionRow
                  key={dim.id}
                  dim={dim}
                  isSelected={dim.id === selectedDimensionId}
                  onSelect={() => onSelectDimension(dim.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* Notes */}
      <TabsContent value="notes" className="flex-1 m-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 flex flex-col gap-2">
            {page.notes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No notes detected on this page</p>
            ) : (
              Object.entries(
                page.notes.reduce<Record<string, QSNote[]>>((acc, n) => {
                  if (!acc[n.category]) acc[n.category] = []
                  acc[n.category].push(n)
                  return acc
                }, {})
              ).map(([category, notes]) => (
                <div key={category}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {category}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="border border-border rounded-md p-2 bg-card hover:border-foreground/20 transition-colors"
                      >
                        <p className="text-xs text-foreground leading-relaxed">{note.text}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <ConfidenceBadge value={note.confidence} />
                          <button className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> Locate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* Issues */}
      <TabsContent value="issues" className="flex-1 m-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 flex flex-col gap-2">
            {issues.filter((i) => i.page === page.number || i.page === null).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircle2 className="h-6 w-6 text-chart-2" />
                <p className="text-xs text-muted-foreground">No issues on this page</p>
              </div>
            ) : (
              issues
                .filter((i) => i.page === page.number || i.page === null)
                .map((issue) => (
                  <div
                    key={issue.id}
                    className={`border rounded-md p-3 ${
                      issue.severity === "error"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-chart-4/30 bg-chart-4/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 mt-0.5 ${
                          issue.severity === "error" ? "text-destructive" : "text-chart-4"
                        }`}
                      />
                      <div className="flex-1">
                        <h4 className="text-xs font-semibold text-foreground">{issue.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {issue.description}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-[10px] h-6"
                        >
                          {issue.suggestedFix}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}

// ── Sub-components ──

function RoomRow({ room }: { room: QSRoom }) {
  return (
    <div className="border border-border rounded-md p-2.5 bg-card hover:border-foreground/20 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">{room.name}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground">
            {ROOM_TYPE_LABELS[room.type] || room.type}
          </Badge>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <Edit3 className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>
          <span className="font-mono font-medium text-foreground">{room.area}</span> m²
        </span>
        <span>
          <span className="font-mono font-medium text-foreground">{room.perimeter}</span> m peri
        </span>
        <span className="text-[10px]">L: {room.level}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <ConfidenceBadge value={room.confidence} />
        {room.verified && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-chart-2/15 text-chart-2 border-chart-2/30">
            Verified
          </Badge>
        )}
      </div>
    </div>
  )
}

function DimensionRow({
  dim,
  isSelected,
  onSelect,
}: {
  dim: QSDimension
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left border rounded-md p-2.5 transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-foreground/20"
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs font-medium text-foreground">{dim.label}</span>
        <span className="text-xs font-mono font-bold text-foreground">
          {dim.value} {dim.units}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
          {dim.type}
        </Badge>
        <ConfidenceBadge value={dim.confidence} />
        {dim.verified ? (
          <CheckCircle2 className="h-3 w-3 text-chart-2" />
        ) : (
          <XCircle className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </button>
  )
}
