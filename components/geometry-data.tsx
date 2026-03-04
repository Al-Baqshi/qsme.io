"use client"

import { computeGeometry } from "@/lib/geometry"

interface GeometryDataProps {
  diameter: number | null
  chordLength: number | null
  chordAngle: number
}

function Row({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-medium text-foreground">
        {value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  )
}

export function GeometryData({ diameter, chordLength, chordAngle }: GeometryDataProps) {
  if (!diameter) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Add a circle to see computed data.
      </p>
    )
  }

  const g = computeGeometry(diameter, chordLength, chordAngle)

  const fmt = (n: number) => {
    if (Number.isInteger(n)) return n.toString()
    return n.toFixed(4)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Circle
        </h3>
        <div className="flex flex-col">
          <Row label="Diameter" value={fmt(g.diameter)} unit="px" />
          <Row label="Radius" value={fmt(g.radius)} unit="px" />
          <Row label="Circumference" value={fmt(g.circumference)} unit="px" />
          <Row label="Area" value={fmt(g.area)} unit="px²" />
        </div>
      </div>

      {g.chord && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Chord / Line
          </h3>
          <div className="flex flex-col">
            <Row label="Chord length" value={fmt(g.chord.length)} unit="px" />
            <Row label="Rotation angle" value={`${g.chord.angle}°`} />
            {chordLength && chordLength > diameter ? (
              <p className="text-sm text-destructive py-2">
                Chord exceeds diameter. Must be &le; {diameter}.
              </p>
            ) : (
              <>
                <Row label="Distance from center" value={fmt(g.chord.distanceFromCenter)} unit="px" />
                <Row label="Sagitta" value={fmt(g.chord.sagitta)} unit="px" />
                <Row label="Central angle" value={`${fmt(g.chord.centralAngle)}°`} />
                <Row label="Arc length (minor)" value={fmt(g.chord.arcLength)} unit="px" />
                <Row label="Sector area" value={fmt(g.chord.sectorArea)} unit="px²" />
                <Row label="Segment area" value={fmt(g.chord.segmentArea)} unit="px²" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
