export interface GeometryResult {
  diameter: number
  radius: number
  circumference: number
  area: number
  chord?: {
    length: number
    angle: number
    distanceFromCenter: number
    sagitta: number
    centralAngle: number
    arcLength: number
    sectorArea: number
    segmentArea: number
  }
}

export function computeGeometry(
  diameter: number,
  chordLength: number | null,
  chordAngle: number
): GeometryResult {
  const radius = diameter / 2
  const circumference = Math.PI * diameter
  const area = Math.PI * radius * radius

  const result: GeometryResult = { diameter, radius, circumference, area }

  if (chordLength && chordLength > 0 && chordLength <= diameter) {
    const halfChord = chordLength / 2
    const distanceFromCenter = Math.sqrt(radius * radius - halfChord * halfChord)
    const sagitta = radius - distanceFromCenter
    const centralAngle = 2 * Math.asin(halfChord / radius) * (180 / Math.PI)
    const centralAngleRad = (centralAngle * Math.PI) / 180
    const arcLength = radius * centralAngleRad
    const sectorArea = 0.5 * radius * radius * centralAngleRad
    const segmentArea = sectorArea - 0.5 * chordLength * distanceFromCenter

    result.chord = {
      length: chordLength,
      angle: chordAngle,
      distanceFromCenter,
      sagitta,
      centralAngle,
      arcLength,
      sectorArea,
      segmentArea,
    }
  }

  return result
}

const fmt = (n: number) => {
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(4)
}

export function geometryToJSON(g: GeometryResult): string {
  return JSON.stringify(
    {
      circle: {
        diameter: g.diameter,
        radius: g.radius,
        circumference: Number(fmt(g.circumference)),
        area: Number(fmt(g.area)),
      },
      ...(g.chord
        ? {
            chord: {
              length: g.chord.length,
              rotationAngle: g.chord.angle,
              distanceFromCenter: Number(fmt(g.chord.distanceFromCenter)),
              sagitta: Number(fmt(g.chord.sagitta)),
              centralAngle: Number(fmt(g.chord.centralAngle)),
              arcLength: Number(fmt(g.chord.arcLength)),
              sectorArea: Number(fmt(g.chord.sectorArea)),
              segmentArea: Number(fmt(g.chord.segmentArea)),
            },
          }
        : {}),
    },
    null,
    2
  )
}

export function geometryToCSV(g: GeometryResult): string {
  const rows: [string, string][] = [
    ["Property", "Value"],
    ["Diameter", fmt(g.diameter)],
    ["Radius", fmt(g.radius)],
    ["Circumference", fmt(g.circumference)],
    ["Area", fmt(g.area)],
  ]

  if (g.chord) {
    rows.push(
      ["Chord Length", fmt(g.chord.length)],
      ["Rotation Angle", `${g.chord.angle}`],
      ["Distance from Center", fmt(g.chord.distanceFromCenter)],
      ["Sagitta", fmt(g.chord.sagitta)],
      ["Central Angle", fmt(g.chord.centralAngle)],
      ["Arc Length", fmt(g.chord.arcLength)],
      ["Sector Area", fmt(g.chord.sectorArea)],
      ["Segment Area", fmt(g.chord.segmentArea)]
    )
  }

  return rows.map((r) => r.join(",")).join("\n")
}
