"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

interface Variant {
  id: string
  label: string
  words: string[]
  elements: React.ReactNode
}

const VARIANTS: Variant[] = [
  {
    id: "e",
    label: "CAD Geometry Tool",
    words: ["CAD", "GEOMETRY", "TOOL"],
    elements: (
      <>
        {/* subtle background grid */}
        <svg className="absolute inset-0 opacity-[0.04]" width="100%" height="100%">
          <defs>
            <pattern id="carousel-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#carousel-grid)" />
        </svg>

        {/* large circle with construction lines - top left */}
        <svg className="absolute -top-6 -left-6 opacity-15" width="220" height="220" viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="190" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.8" />
          <circle cx="210" cy="210" r="190" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.5" strokeDasharray="8 4" />
          <circle cx="210" cy="210" r="140" fill="none" stroke="hsl(210 80% 45%)" strokeWidth="0.5" strokeDasharray="4 8" />
          <circle cx="210" cy="210" r="80" fill="none" stroke="hsl(210 80% 40%)" strokeWidth="0.3" strokeDasharray="2 6" />
          <line x1="0" y1="210" x2="420" y2="210" stroke="hsl(210 80% 55%)" strokeWidth="0.4" strokeDasharray="6 6" />
          <line x1="210" y1="0" x2="210" y2="420" stroke="hsl(210 80% 55%)" strokeWidth="0.4" strokeDasharray="6 6" />
          <line x1="10" y1="10" x2="410" y2="410" stroke="hsl(210 80% 45%)" strokeWidth="0.3" strokeDasharray="4 8" />
          <circle cx="210" cy="210" r="3" fill="hsl(210 80% 55%)" />
        </svg>

        {/* circle+chord with dimension line - bottom right */}
        <svg className="absolute -bottom-4 -right-4 opacity-25 rotate-12" width="180" height="180" viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(210 80% 60%)" strokeWidth="1.5" />
          <line x1="38" y1="224" x2="282" y2="96" stroke="hsl(350 75% 55%)" strokeWidth="2" />
          <line x1="160" y1="160" x2="134" y2="176" stroke="hsl(40 80% 55%)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="160" cy="160" r="2.5" fill="hsl(210 80% 60%)" />
          {/* dimension annotation */}
          <text x="180" y="198" fill="hsl(170 70% 50%)" fontSize="10" fontFamily="monospace" transform="rotate(-27 180 198)">320</text>
        </svg>

        {/* bezier curve with control handles - left */}
        <svg className="absolute top-[35%] -left-1 opacity-15" width="130" height="100" viewBox="0 0 260 200">
          <line x1="30" y1="170" x2="80" y2="30" stroke="hsl(280 60% 55%)" strokeWidth="0.7" strokeDasharray="3 3" />
          <line x1="230" y1="160" x2="180" y2="20" stroke="hsl(280 60% 55%)" strokeWidth="0.7" strokeDasharray="3 3" />
          <path d="M 30 170 C 80 30, 180 20, 230 160" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="2" />
          <circle cx="30" cy="170" r="4" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="1.5" />
          <circle cx="80" cy="30" r="3" fill="hsl(280 60% 55%)" />
          <circle cx="180" cy="20" r="3" fill="hsl(280 60% 55%)" />
          <circle cx="230" cy="160" r="4" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="1.5" />
        </svg>

        {/* hexagon wireframe - top center-right */}
        <svg className="absolute top-2 right-[30%] opacity-[0.10]" width="60" height="60" viewBox="0 0 140 140">
          <polygon points="70,5 130,37 130,103 70,135 10,103 10,37" fill="none" stroke="hsl(210 80% 60%)" strokeWidth="1" />
          <polygon points="70,25 110,47 110,93 70,115 30,93 30,47" fill="none" stroke="hsl(210 80% 50%)" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>

        {/* data panel - top right */}
        <div className="absolute top-3 right-3 opacity-45">
          <div className="bg-white/5 border border-white/15 rounded-lg p-1.5">
            <div className="flex flex-col gap-0.5 text-[7px] font-mono">
              <div className="flex justify-between gap-2">
                <span className="text-white/40">diameter</span>
                <span className="text-white/70 tabular-nums">400</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-white/40">area</span>
                <span className="text-white/70 tabular-nums">125663</span>
              </div>
              <div className="h-px bg-white/10 my-0.5" />
              <div className="flex justify-between gap-2">
                <span className="text-white/40">chord</span>
                <span className="text-white/70 tabular-nums">320</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-white/40">sagitta</span>
                <span className="text-white/70 tabular-nums">40</span>
              </div>
            </div>
          </div>
        </div>

        {/* tool calls - bottom left */}
        <div className="absolute bottom-4 left-3 opacity-45">
          <div className="flex flex-col gap-1">
            <div className="bg-white/5 border border-white/15 rounded-md px-1.5 py-0.5">
              <span className="text-[7px] font-mono text-white/60">createCircle(400)</span>
            </div>
            <div className="bg-white/5 border border-white/15 rounded-md px-1.5 py-0.5">
              <span className="text-[7px] font-mono text-white/60">addChord(320, 33)</span>
            </div>
            <div className="bg-white/5 border border-emerald-500/15 rounded-md px-1.5 py-0.5">
              <span className="text-[7px] font-mono text-emerald-400/70">{"{ ok: true }"}</span>
            </div>
          </div>
        </div>

        {/* coordinate readout - top center */}
        <div className="absolute top-3 left-[28%] opacity-15">
          <div className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 flex items-center gap-1.5">
            <span className="text-[6px] font-mono text-red-400/60">X</span>
            <span className="text-[7px] font-mono text-white/50 tabular-nums">284</span>
            <span className="text-[6px] font-mono text-green-400/60">Y</span>
            <span className="text-[7px] font-mono text-white/50 tabular-nums">156</span>
          </div>
        </div>

        {/* snap indicators - bottom right */}
        <div className="absolute bottom-3 right-3 opacity-15 flex gap-1">
          <div className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[6px] font-mono text-white/40">SNAP</div>
          <div className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[6px] font-mono text-white/40">GRID</div>
        </div>

        {/* small crosshair */}
        <svg className="absolute top-[45%] left-[55%] opacity-[0.07]" width="16" height="16" viewBox="0 0 30 30">
          <line x1="15" y1="5" x2="15" y2="25" stroke="white" strokeWidth="0.5" />
          <line x1="5" y1="15" x2="25" y2="15" stroke="white" strokeWidth="0.5" />
          <circle cx="15" cy="15" r="6" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </>
    ),
  },
  {
    id: "f",
    label: "Parametric Engine",
    words: ["PARAMETRIC", "DESIGN", "ENGINE"],
    elements: (
      <>
        {/* dot + line grid background */}
        <svg className="absolute inset-0 opacity-[0.03]" width="100%" height="100%">
          <defs>
            <pattern id="carousel-dotgrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="8" cy="8" r="0.5" fill="white" />
            </pattern>
            <pattern id="carousel-finegrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M 16 0 L 0 0 0 16" fill="none" stroke="white" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#carousel-finegrid)" />
          <rect width="100%" height="100%" fill="url(#carousel-dotgrid)" />
        </svg>

        {/* involute gear profile - top left */}
        <svg className="absolute -top-8 -left-8 opacity-[0.10]" width="200" height="200" viewBox="0 0 380 380">
          <circle cx="190" cy="190" r="170" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.6" />
          <circle cx="190" cy="190" r="150" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.8" />
          <circle cx="190" cy="190" r="130" fill="none" stroke="hsl(210 80% 45%)" strokeWidth="0.4" strokeDasharray="4 6" />
          <circle cx="190" cy="190" r="100" fill="none" stroke="hsl(210 80% 40%)" strokeWidth="0.3" strokeDasharray="2 4" />
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16
            const rad = (angle * Math.PI) / 180
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            return (
              <line
                key={`gear-c-${i}`}
                x1={190 + 130 * cos}
                y1={190 + 130 * sin}
                x2={190 + 170 * cos}
                y2={190 + 170 * sin}
                stroke="hsl(210 80% 55%)"
                strokeWidth="0.5"
              />
            )
          })}
          <line x1="0" y1="190" x2="380" y2="190" stroke="hsl(210 80% 50%)" strokeWidth="0.3" strokeDasharray="6 6" />
          <line x1="190" y1="0" x2="190" y2="380" stroke="hsl(210 80% 50%)" strokeWidth="0.3" strokeDasharray="6 6" />
          <circle cx="190" cy="190" r="3" fill="hsl(210 80% 55%)" />
          <line x1="190" y1="190" x2="310" y2="100" stroke="hsl(40 80% 55%)" strokeWidth="0.6" strokeDasharray="3 3" />
        </svg>

        {/* golden spiral - bottom right */}
        <svg className="absolute -bottom-6 -right-6 opacity-[0.12] -rotate-6" width="180" height="180" viewBox="0 0 360 360">
          <path
            d="M 180 180 C 180 120, 240 60, 300 60 C 360 60, 360 120, 360 180 C 360 280, 280 360, 180 360 C 40 360, 0 220, 0 180 C 0 60, 80 0, 180 0"
            fill="none"
            stroke="hsl(45 80% 50%)"
            strokeWidth="1.5"
          />
          <rect x="180" y="60" width="180" height="120" fill="none" stroke="hsl(45 70% 45%)" strokeWidth="0.4" strokeDasharray="4 4" />
          <rect x="180" y="180" width="180" height="180" fill="none" stroke="hsl(45 70% 45%)" strokeWidth="0.4" strokeDasharray="4 4" />
          <rect x="0" y="180" width="180" height="180" fill="none" stroke="hsl(45 70% 45%)" strokeWidth="0.4" strokeDasharray="4 4" />
          <text x="160" y="195" fill="hsl(45 80% 50%)" fontSize="8" fontFamily="monospace">&phi;</text>
          <circle cx="180" cy="180" r="2" fill="hsl(45 80% 50%)" />
        </svg>

        {/* ellipse with foci - center right */}
        <svg className="absolute top-[20%] right-[5%] opacity-[0.10]" width="110" height="75" viewBox="0 0 220 150">
          <ellipse cx="110" cy="75" rx="100" ry="60" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="1.2" />
          <circle cx="30" cy="75" r="2.5" fill="hsl(350 75% 55%)" />
          <circle cx="190" cy="75" r="2.5" fill="hsl(350 75% 55%)" />
          <line x1="10" y1="75" x2="210" y2="75" stroke="hsl(280 60% 50%)" strokeWidth="0.4" strokeDasharray="3 4" />
          <line x1="110" y1="15" x2="110" y2="135" stroke="hsl(280 60% 50%)" strokeWidth="0.4" strokeDasharray="3 4" />
          <line x1="30" y1="75" x2="160" y2="28" stroke="hsl(170 70% 50%)" strokeWidth="0.5" strokeDasharray="2 3" />
          <line x1="190" y1="75" x2="160" y2="28" stroke="hsl(170 70% 50%)" strokeWidth="0.5" strokeDasharray="2 3" />
          <circle cx="160" cy="28" r="2" fill="hsl(170 70% 50%)" />
        </svg>

        {/* pentagon with diagonals - top center */}
        <svg className="absolute top-1 left-[40%] opacity-[0.07]" width="50" height="50" viewBox="0 0 110 110">
          <polygon points="55,7 103,42 84,97 26,97 7,42" fill="none" stroke="hsl(210 80% 60%)" strokeWidth="0.8" />
          <line x1="55" y1="7" x2="84" y2="97" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          <line x1="55" y1="7" x2="26" y2="97" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          <line x1="103" y1="42" x2="26" y2="97" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          <line x1="103" y1="42" x2="7" y2="42" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          <line x1="84" y1="97" x2="7" y2="42" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
        </svg>

        {/* bezier surface wireframe - right lower */}
        <svg className="absolute top-[55%] right-1 opacity-[0.07]" width="80" height="60" viewBox="0 0 160 120">
          <path d="M 10 20 C 50 5, 110 5, 150 20" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="0.6" />
          <path d="M 5 50 C 50 30, 110 30, 155 50" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="0.6" />
          <path d="M 8 80 C 50 60, 110 65, 152 80" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="0.6" />
          <path d="M 12 110 C 50 95, 110 100, 148 110" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="0.6" />
          <path d="M 10 20 C 5 40, 8 70, 12 110" fill="none" stroke="hsl(280 60% 50%)" strokeWidth="0.4" />
          <path d="M 60 10 C 55 35, 55 65, 58 105" fill="none" stroke="hsl(280 60% 50%)" strokeWidth="0.4" />
          <path d="M 100 10 C 105 35, 103 68, 100 105" fill="none" stroke="hsl(280 60% 50%)" strokeWidth="0.4" />
          <path d="M 150 20 C 155 45, 152 75, 148 110" fill="none" stroke="hsl(280 60% 50%)" strokeWidth="0.4" />
        </svg>

        {/* properties panel - top right */}
        <div className="absolute top-2.5 right-2.5 opacity-40">
          <div className="bg-white/5 border border-white/12 rounded-lg p-1.5">
            <div className="text-[6px] font-mono text-white/25 uppercase tracking-wider mb-1">Properties</div>
            <div className="flex flex-col gap-0.5 text-[6px] font-mono">
              <div className="flex justify-between gap-2">
                <span className="text-white/30">type</span>
                <span className="text-blue-400/60">GearProfile</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-white/30">teeth</span>
                <span className="text-white/60 tabular-nums">16</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-white/30">module</span>
                <span className="text-white/60 tabular-nums">2.5</span>
              </div>
              <div className="h-px bg-white/8 my-0.5" />
              <div className="flex justify-between gap-2">
                <span className="text-white/30">tolerance</span>
                <span className="text-emerald-400/60">ISO 6</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-white/30">runout</span>
                <span className="text-white/60 tabular-nums">&plusmn;0.012</span>
              </div>
            </div>
          </div>
        </div>

        {/* agent pipeline - bottom left */}
        <div className="absolute bottom-3 left-2.5 opacity-40">
          <div className="flex flex-col gap-0.5">
            <div className="bg-white/5 border border-white/12 rounded-md px-1.5 py-0.5 flex items-center gap-1">
              <span className="text-[5px] font-mono text-emerald-400/40">01</span>
              <span className="text-[6px] font-mono text-white/55">createGear(16, 2.5)</span>
            </div>
            <div className="bg-white/5 border border-white/12 rounded-md px-1.5 py-0.5 flex items-center gap-1">
              <span className="text-[5px] font-mono text-emerald-400/40">02</span>
              <span className="text-[6px] font-mono text-white/55">addSpiral(origin)</span>
            </div>
            <div className="bg-white/5 border border-white/12 rounded-md px-1.5 py-0.5 flex items-center gap-1">
              <span className="text-[5px] font-mono text-emerald-400/40">03</span>
              <span className="text-[6px] font-mono text-white/55">fitEllipse(foci)</span>
            </div>
            <div className="bg-white/5 border border-emerald-500/15 rounded-md px-1.5 py-0.5">
              <span className="text-[6px] font-mono text-emerald-400/60">{"{ ok, entities: 4 }"}</span>
            </div>
          </div>
        </div>

        {/* coordinate readout with Z axis - top left area */}
        <div className="absolute top-2.5 left-[25%] opacity-12">
          <div className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 flex items-center gap-1">
            <span className="text-[5px] font-mono text-red-400/50">X</span>
            <span className="text-[6px] font-mono text-white/45 tabular-nums">312</span>
            <span className="text-[5px] font-mono text-green-400/50">Y</span>
            <span className="text-[6px] font-mono text-white/45 tabular-nums">184</span>
            <span className="text-[5px] font-mono text-blue-400/50">Z</span>
            <span className="text-[6px] font-mono text-white/45 tabular-nums">0</span>
          </div>
        </div>

        {/* constraint toolbar - left edge */}
        <div className="absolute top-[30%] left-1.5 opacity-12">
          <div className="bg-white/5 border border-white/8 rounded p-0.5 flex flex-col gap-0 text-[8px] text-white/35">
            <div className="w-4 h-4 flex items-center justify-center">∥</div>
            <div className="w-4 h-4 flex items-center justify-center">⊥</div>
            <div className="w-4 h-4 flex items-center justify-center">⊙</div>
            <div className="w-4 h-4 flex items-center justify-center">∠</div>
          </div>
        </div>

        {/* entity tree snippet - right lower */}
        <div className="absolute top-[55%] right-2.5 opacity-15">
          <div className="text-[5px] font-mono text-white/30 leading-relaxed">
            <div><span className="text-blue-400/50">&#9656;</span> GearProfile_01</div>
            <div><span className="text-amber-400/50">&#9656;</span> GoldenSpiral</div>
            <div><span className="text-purple-400/50">&#9656;</span> Ellipse_01</div>
          </div>
        </div>

        {/* stats bar - bottom center */}
        <div className="absolute bottom-2 left-[30%] opacity-10">
          <div className="flex items-center gap-2 text-[5px] font-mono text-white/35">
            <span>47 entities</span>
            <span>&middot;</span>
            <span>23 constraints</span>
            <span>&middot;</span>
            <span>2.1ms</span>
          </div>
        </div>

        {/* export chips */}
        <div className="absolute top-[78%] left-[28%] opacity-10 flex gap-1">
          <div className="bg-white/5 border border-white/8 rounded px-1 py-0.5 text-[5px] font-mono text-white/35">STEP</div>
          <div className="bg-white/5 border border-white/8 rounded px-1 py-0.5 text-[5px] font-mono text-white/35">IGES</div>
          <div className="bg-white/5 border border-white/8 rounded px-1 py-0.5 text-[5px] font-mono text-white/35">STL</div>
          <div className="bg-white/5 border border-white/8 rounded px-1 py-0.5 text-[5px] font-mono text-white/35">glTF</div>
        </div>

        {/* small crosshair */}
        <svg className="absolute top-[40%] left-[50%] opacity-[0.05]" width="14" height="14" viewBox="0 0 20 20">
          <line x1="10" y1="2" x2="10" y2="18" stroke="white" strokeWidth="0.5" />
          <line x1="2" y1="10" x2="18" y2="10" stroke="white" strokeWidth="0.5" />
          <circle cx="10" cy="10" r="4" fill="none" stroke="white" strokeWidth="0.4" />
        </svg>

        {/* angle annotation */}
        <svg className="absolute top-[40%] left-[60%] opacity-[0.07]" width="35" height="35" viewBox="0 0 70 70">
          <path d="M 10 60 L 60 60" stroke="hsl(40 80% 55%)" strokeWidth="1" />
          <path d="M 10 60 L 50 12" stroke="hsl(40 80% 55%)" strokeWidth="1" />
          <path d="M 30 60 A 20 20 0 0 0 34 40" fill="none" stroke="hsl(40 80% 55%)" strokeWidth="0.8" />
          <text x="37" y="50" fill="hsl(40 80% 55%)" fontSize="7" fontFamily="monospace">20&deg;</text>
        </svg>
      </>
    ),
  },
  {
    id: "a",
    label: "Circle Tool",
    words: ["CIRCLE", "TOOL"],
    elements: (
      <>
        <svg className="absolute top-6 left-8 opacity-30 -rotate-2" width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="2" />
          <circle cx="60" cy="60" r="3" fill="hsl(210 80% 55%)" />
        </svg>
        <svg className="absolute bottom-8 right-12 opacity-80 rotate-1" width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="hsl(210 80% 65%)" strokeWidth="1.5" />
          <line x1="15" y1="55" x2="65" y2="25" stroke="hsl(350 75% 55%)" strokeWidth="1.5" />
        </svg>
      </>
    ),
  },
  {
    id: "b",
    label: "AI Agent",
    words: ["AI", "AGENT"],
    elements: (
      <>
        <div className="absolute top-8 right-10 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-[11px] font-mono text-white/60 -rotate-2 opacity-40">
          setCircle(300)
        </div>
        <div className="absolute bottom-10 left-8 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-[11px] font-mono text-white/80 rotate-1 opacity-80">
          {"{ ok: true, diameter: 300 }"}
        </div>
      </>
    ),
  },
  {
    id: "c",
    label: "Geometry",
    words: ["GEOMETRY", "DATA"],
    elements: (
      <>
        <div className="absolute top-6 left-6 opacity-30 -rotate-3">
          <div className="flex flex-col gap-0.5 text-[10px] font-mono text-white/60">
            <span>circumference: 628.32</span>
            <span>area: 31415.93</span>
            <span>sagitta: 12.84</span>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 opacity-80 rotate-2">
          <div className="flex flex-col gap-0.5 text-[10px] font-mono text-white/80 bg-white/5 rounded p-2 border border-white/10">
            <span>arcLength: 98.17</span>
            <span>centralAngle: 44.05</span>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "d",
    label: "Export",
    words: ["EXPORT"],
    elements: (
      <>
        <div className="absolute top-8 left-8 opacity-40 -rotate-1 flex gap-2">
          <div className="bg-white/10 border border-white/20 rounded px-2 py-1 text-[10px] font-mono text-white/70">JPG</div>
          <div className="bg-white/10 border border-white/20 rounded px-2 py-1 text-[10px] font-mono text-white/70">PNG</div>
          <div className="bg-white/10 border border-white/20 rounded px-2 py-1 text-[10px] font-mono text-white/70">CSV</div>
        </div>
        <div className="absolute bottom-10 right-10 opacity-80 rotate-2 bg-white/5 border border-white/10 rounded-lg p-2">
          <div className="w-16 h-16 relative">
            <svg viewBox="0 0 64 64" className="w-full h-full">
              <circle cx="32" cy="32" r="24" fill="none" stroke="hsl(210 80% 65%)" strokeWidth="1.5" />
              <line x1="12" y1="44" x2="52" y2="20" stroke="hsl(350 75% 55%)" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </>
    ),
  },
]

const INTERVAL = 5000

export function ThumbnailCarousel() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const startRef = useRef(Date.now())
  const rafRef = useRef<number>(0)

  const advance = useCallback(() => {
    setActive((prev) => (prev + 1) % VARIANTS.length)
    setProgress(0)
    startRef.current = Date.now()
  }, [])

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    startRef.current = Date.now() - progress * INTERVAL

    function tick() {
      const elapsed = Date.now() - startRef.current
      const pct = Math.min(elapsed / INTERVAL, 1)
      setProgress(pct)
      if (pct >= 1) {
        advance()
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [paused, active, advance, progress])

  function selectVariant(i: number) {
    setActive(i)
    setProgress(0)
    startRef.current = Date.now()
  }

  const v = VARIANTS[active]

  return (
    <div className="flex flex-col gap-4">
      {/* thumbnail display */}
      <div
        className="relative w-full overflow-hidden rounded-lg border border-border"
        style={{ aspectRatio: "1200/630" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0 bg-primary">
          {/* floating UI elements */}
          {v.elements}

          {/* big words */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            {v.words.map((word) => (
              <span
                key={word}
                className="font-mono font-black text-primary-foreground tracking-tighter leading-none"
                style={{ fontSize: v.words.length > 2 ? "clamp(1.5rem, 6vw, 3.8rem)" : "clamp(2rem, 8vw, 5rem)" }}
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-foreground/10">
          <div
            className="h-full bg-primary-foreground/40 transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* chip selectors + open link */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {VARIANTS.map((variant, i) => (
            <button
              key={variant.id}
              onClick={() => selectVariant(i)}
              className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-colors ${
                i === active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              {variant.label}
            </button>
          ))}
        </div>
        <Link
          href={`/thumbnail?v=${v.id}`}
          target="_blank"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Open full-size <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
