interface ThumbnailProps {
  variant?: "a" | "b" | "c" | "d" | "e" | "f"
}

const VARIANTS = {
  a: {
    words: ["CIRCLE", "TOOL"],
    elements: (
      <>
        <svg className="absolute top-12 left-16 opacity-30 -rotate-2" width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="2.5" />
          <circle cx="100" cy="100" r="4" fill="hsl(210 80% 55%)" />
        </svg>
        <svg className="absolute bottom-14 right-20 opacity-80 rotate-1" width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="50" fill="none" stroke="hsl(210 80% 65%)" strokeWidth="2" />
          <line x1="28" y1="95" x2="112" y2="45" stroke="hsl(350 75% 55%)" strokeWidth="2" />
        </svg>
      </>
    ),
  },
  b: {
    words: ["AI", "AGENT"],
    elements: (
      <>
        <div className="absolute top-14 right-16 bg-white/10 border border-white/20 rounded-xl px-5 py-3 text-sm font-mono text-white/60 -rotate-2 opacity-40">
          setCircle(300)
        </div>
        <div className="absolute bottom-16 left-14 bg-white/10 border border-white/20 rounded-xl px-5 py-3 text-sm font-mono text-white/80 rotate-1 opacity-80">
          {"{ ok: true, diameter: 300 }"}
        </div>
      </>
    ),
  },
  c: {
    words: ["GEOMETRY", "DATA"],
    elements: (
      <>
        <div className="absolute top-10 left-10 opacity-30 -rotate-3">
          <div className="flex flex-col gap-1 text-xs font-mono text-white/60">
            <span>circumference: 628.3185</span>
            <span>area: 31415.9265</span>
            <span>sagitta: 12.8378</span>
          </div>
        </div>
        <div className="absolute bottom-12 right-12 opacity-80 rotate-2">
          <div className="flex flex-col gap-1 text-xs font-mono text-white/80 bg-white/5 rounded-lg p-3 border border-white/10">
            <span>arcLength: 98.17</span>
            <span>centralAngle: 44.05</span>
            <span>sectorArea: 4908.50</span>
          </div>
        </div>
      </>
    ),
  },
  d: {
    words: ["EXPORT"],
    elements: (
      <>
        <div className="absolute top-12 left-12 opacity-40 -rotate-1 flex gap-3">
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-white/70">JPG</div>
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-white/70">PNG</div>
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-white/70">CSV</div>
          <div className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-white/70">JSON</div>
        </div>
        <div className="absolute bottom-14 right-16 opacity-80 rotate-2 bg-white/5 border border-white/10 rounded-xl p-4">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(210 80% 65%)" strokeWidth="2" />
            <line x1="18" y1="68" x2="82" y2="32" stroke="hsl(350 75% 55%)" strokeWidth="2" />
          </svg>
        </div>
      </>
    ),
  },
  e: {
    words: ["CAD", "GEOMETRY", "TOOL"],
    elements: (
      <>
        {/* subtle background grid */}
        <svg className="absolute inset-0 opacity-[0.04]" width="1200" height="630">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="1200" height="630" fill="url(#grid)" />
        </svg>

        {/* large circle with detailed construction lines - top left */}
        <svg className="absolute -top-10 -left-12 opacity-15" width="420" height="420" viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="190" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.8" />
          <circle cx="210" cy="210" r="190" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.5" strokeDasharray="8 4" />
          <circle cx="210" cy="210" r="140" fill="none" stroke="hsl(210 80% 45%)" strokeWidth="0.5" strokeDasharray="4 8" />
          <circle cx="210" cy="210" r="80" fill="none" stroke="hsl(210 80% 40%)" strokeWidth="0.3" strokeDasharray="2 6" />
          <line x1="0" y1="210" x2="420" y2="210" stroke="hsl(210 80% 55%)" strokeWidth="0.4" strokeDasharray="6 6" />
          <line x1="210" y1="0" x2="210" y2="420" stroke="hsl(210 80% 55%)" strokeWidth="0.4" strokeDasharray="6 6" />
          <line x1="10" y1="10" x2="410" y2="410" stroke="hsl(210 80% 45%)" strokeWidth="0.3" strokeDasharray="4 8" />
          <line x1="410" y1="10" x2="10" y2="410" stroke="hsl(210 80% 45%)" strokeWidth="0.3" strokeDasharray="4 8" />
          <circle cx="210" cy="210" r="3" fill="hsl(210 80% 55%)" />
          {/* tick marks on axes */}
          {[50, 100, 150, 250, 300, 350].map((t) => (
            <g key={`tick-${t}`}>
              <line x1={t} y1="206" x2={t} y2="214" stroke="hsl(210 80% 55%)" strokeWidth="0.4" />
              <line x1="206" y1={t} x2="214" y2={t} stroke="hsl(210 80% 55%)" strokeWidth="0.4" />
            </g>
          ))}
        </svg>

        {/* medium circle with chord and dimension lines - bottom right */}
        <svg className="absolute -bottom-8 -right-8 opacity-25 rotate-12" width="320" height="320" viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(210 80% 60%)" strokeWidth="1.5" />
          <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(210 80% 50%)" strokeWidth="0.5" strokeDasharray="3 6" />
          <line x1="38" y1="224" x2="282" y2="96" stroke="hsl(350 75% 55%)" strokeWidth="2" />
          {/* perpendicular from center to chord */}
          <line x1="160" y1="160" x2="134" y2="176" stroke="hsl(40 80% 55%)" strokeWidth="1" strokeDasharray="4 3" />
          {/* right-angle indicator */}
          <rect x="129" y="167" width="8" height="8" fill="none" stroke="hsl(40 80% 55%)" strokeWidth="0.8" transform="rotate(-33 133 171)" />
          <circle cx="160" cy="160" r="2.5" fill="hsl(210 80% 60%)" />
          {/* dimension arrow along chord */}
          <line x1="52" y1="238" x2="268" y2="110" stroke="hsl(170 70% 50%)" strokeWidth="0.6" />
          <polygon points="52,238 58,232 56,240" fill="hsl(170 70% 50%)" />
          <polygon points="268,110 262,116 264,108" fill="hsl(170 70% 50%)" />
          <text x="180" y="198" fill="hsl(170 70% 50%)" fontSize="9" fontFamily="monospace" transform="rotate(-27 180 198)">320.00</text>
        </svg>

        {/* bezier curve with control handles - center left */}
        <svg className="absolute top-[160px] -left-2 opacity-20" width="260" height="200" viewBox="0 0 260 200">
          {/* control lines */}
          <line x1="30" y1="170" x2="80" y2="30" stroke="hsl(280 60% 55%)" strokeWidth="0.7" strokeDasharray="3 3" />
          <line x1="230" y1="160" x2="180" y2="20" stroke="hsl(280 60% 55%)" strokeWidth="0.7" strokeDasharray="3 3" />
          {/* bezier curve */}
          <path d="M 30 170 C 80 30, 180 20, 230 160" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="2" />
          {/* control points */}
          <circle cx="30" cy="170" r="4" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="1.5" />
          <circle cx="80" cy="30" r="3" fill="hsl(280 60% 55%)" />
          <circle cx="180" cy="20" r="3" fill="hsl(280 60% 55%)" />
          <circle cx="230" cy="160" r="4" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="1.5" />
        </svg>

        {/* hexagon wireframe - top center-right */}
        <svg className="absolute top-[30px] right-[260px] opacity-[0.12]" width="140" height="140" viewBox="0 0 140 140">
          <polygon points="70,5 130,37 130,103 70,135 10,103 10,37" fill="none" stroke="hsl(210 80% 60%)" strokeWidth="1" />
          <polygon points="70,25 110,47 110,93 70,115 30,93 30,47" fill="none" stroke="hsl(210 80% 50%)" strokeWidth="0.5" strokeDasharray="4 4" />
          {/* vertex markers */}
          {[[70,5],[130,37],[130,103],[70,135],[10,103],[10,37]].map(([x,y], i) => (
            <circle key={`hex-${i}`} cx={x} cy={y} r="2" fill="hsl(210 80% 60%)" />
          ))}
          {/* radial lines from center */}
          {[[70,5],[130,37],[130,103],[70,135],[10,103],[10,37]].map(([x,y], i) => (
            <line key={`hexr-${i}`} x1="70" y1="70" x2={x} y2={y} stroke="hsl(210 80% 50%)" strokeWidth="0.3" strokeDasharray="2 4" />
          ))}
        </svg>

        {/* isometric cube wireframe - bottom center */}
        <svg className="absolute bottom-[50px] left-[420px] opacity-[0.10]" width="120" height="130" viewBox="0 0 120 130">
          {/* front face */}
          <polygon points="60,10 110,35 110,95 60,120 10,95 10,35" fill="none" stroke="hsl(170 70% 50%)" strokeWidth="1" />
          {/* inner edges */}
          <line x1="60" y1="10" x2="60" y2="70" stroke="hsl(170 70% 50%)" strokeWidth="0.6" />
          <line x1="10" y1="35" x2="60" y2="70" stroke="hsl(170 70% 50%)" strokeWidth="0.6" />
          <line x1="110" y1="35" x2="60" y2="70" stroke="hsl(170 70% 50%)" strokeWidth="0.6" />
          {/* hidden edges */}
          <line x1="60" y1="70" x2="60" y2="120" stroke="hsl(170 70% 50%)" strokeWidth="0.4" strokeDasharray="3 3" />
          <line x1="60" y1="70" x2="10" y2="95" stroke="hsl(170 70% 50%)" strokeWidth="0.4" strokeDasharray="3 3" />
          <line x1="60" y1="70" x2="110" y2="95" stroke="hsl(170 70% 50%)" strokeWidth="0.4" strokeDasharray="3 3" />
        </svg>

        {/* angle arc with annotation - right side */}
        <svg className="absolute top-[220px] right-[160px] opacity-20" width="90" height="90" viewBox="0 0 90 90">
          <path d="M 20 70 L 75 70" stroke="hsl(40 80% 55%)" strokeWidth="1.2" />
          <path d="M 20 70 L 60 15" stroke="hsl(40 80% 55%)" strokeWidth="1.2" />
          <path d="M 45 70 A 25 25 0 0 0 44 45" fill="none" stroke="hsl(40 80% 55%)" strokeWidth="1" />
          <text x="50" y="58" fill="hsl(40 80% 55%)" fontSize="9" fontFamily="monospace">33.0&deg;</text>
          {/* small dot at vertex */}
          <circle cx="20" cy="70" r="2" fill="hsl(40 80% 55%)" />
        </svg>

        {/* triangle with circumscribed circle - far bottom left */}
        <svg className="absolute bottom-[80px] left-[180px] opacity-[0.08]" width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(210 80% 60%)" strokeWidth="0.8" />
          <polygon points="50,8 92,72 8,72" fill="none" stroke="hsl(350 75% 55%)" strokeWidth="1" />
          <circle cx="50" cy="50" r="2" fill="hsl(210 80% 60%)" />
        </svg>

        {/* geometry data panel - top right */}
        <div className="absolute top-8 right-8 opacity-60 rotate-1">
          <div className="bg-white/5 border border-white/15 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-2">Circle Properties</div>
            <div className="flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex justify-between gap-6">
                <span className="text-white/40">diameter</span>
                <span className="text-white/80 tabular-nums">400.00</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-white/40">radius</span>
                <span className="text-white/80 tabular-nums">200.00</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-white/40">circumference</span>
                <span className="text-white/80 tabular-nums">1256.64</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-white/40">area</span>
                <span className="text-white/80 tabular-nums">125663.71</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider mb-0.5">Chord Analysis</div>
              <div className="flex justify-between gap-6">
                <span className="text-white/40">chordLength</span>
                <span className="text-white/80 tabular-nums">320.00</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-white/40">sagitta</span>
                <span className="text-white/80 tabular-nums">40.00</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-white/40">arcLength</span>
                <span className="text-white/80 tabular-nums">369.15</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-white/40">sectorArea</span>
                <span className="text-white/80 tabular-nums">36915.47</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI tool call panel - bottom left */}
        <div className="absolute bottom-10 left-8 opacity-60 -rotate-1">
          <div className="flex flex-col gap-1.5">
            <div className="text-[9px] font-mono text-white/20 uppercase tracking-wider ml-1">Tool Invocations</div>
            <div className="bg-white/5 border border-white/15 rounded-lg px-4 py-2 backdrop-blur-sm">
              <span className="text-xs font-mono text-emerald-400/50">{">"}</span>
              <span className="text-xs font-mono text-white/80 ml-1">createCircle(400)</span>
            </div>
            <div className="bg-white/5 border border-white/15 rounded-lg px-4 py-2 backdrop-blur-sm">
              <span className="text-xs font-mono text-emerald-400/50">{">"}</span>
              <span className="text-xs font-mono text-white/80 ml-1">addChord(320, 33)</span>
            </div>
            <div className="bg-white/5 border border-white/15 rounded-lg px-4 py-2 backdrop-blur-sm">
              <span className="text-xs font-mono text-emerald-400/50">{">"}</span>
              <span className="text-xs font-mono text-white/80 ml-1">drawBezier([30,170], [230,160])</span>
            </div>
            <div className="bg-white/8 border border-emerald-500/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <span className="text-[10px] font-mono text-emerald-400/80">{"{ ok: true, entities: 3 }"}</span>
            </div>
          </div>
        </div>

        {/* coordinate readout - top left area */}
        <div className="absolute top-10 left-[320px] opacity-25">
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 backdrop-blur-sm flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-red-400/70">X</span>
              <span className="text-[10px] font-mono text-white/70 tabular-nums">284.50</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-green-400/70">Y</span>
              <span className="text-[10px] font-mono text-white/70 tabular-nums">156.22</span>
            </div>
          </div>
        </div>

        {/* mini toolbar - left edge */}
        <div className="absolute top-[180px] left-4 opacity-20">
          <div className="bg-white/5 border border-white/10 rounded-lg p-1.5 flex flex-col gap-1 backdrop-blur-sm">
            {["○", "╱", "◇", "⬡", "⌒"].map((icon) => (
              <div key={icon} className="w-7 h-7 rounded flex items-center justify-center text-white/50 text-xs hover:bg-white/10">
                {icon}
              </div>
            ))}
          </div>
        </div>

        {/* layers panel - right edge */}
        <div className="absolute top-[260px] right-8 opacity-25 -rotate-1">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-[8px] font-mono text-white/30 uppercase tracking-wider mb-2">Layers</div>
            <div className="flex flex-col gap-1.5">
              {[
                { name: "Circles", color: "bg-blue-400/60" },
                { name: "Chords", color: "bg-red-400/60" },
                { name: "Beziers", color: "bg-purple-400/60" },
                { name: "Annotations", color: "bg-amber-400/60" },
              ].map((layer) => (
                <div key={layer.name} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${layer.color}`} />
                  <span className="text-[9px] font-mono text-white/50">{layer.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* export format chips - top center-left */}
        <div className="absolute top-[68px] left-[330px] opacity-20 flex gap-2">
          <div className="bg-white/8 border border-white/15 rounded-md px-2.5 py-1 text-[10px] font-mono text-white/60">SVG</div>
          <div className="bg-white/8 border border-white/15 rounded-md px-2.5 py-1 text-[10px] font-mono text-white/60">DXF</div>
          <div className="bg-white/8 border border-white/15 rounded-md px-2.5 py-1 text-[10px] font-mono text-white/60">PNG</div>
          <div className="bg-white/8 border border-white/15 rounded-md px-2.5 py-1 text-[10px] font-mono text-white/60">JSON</div>
        </div>

        {/* model selector chip - bottom center-right */}
        <div className="absolute bottom-10 right-[280px] opacity-20">
          <div className="bg-white/8 border border-white/15 rounded-full px-4 py-1.5 text-[10px] font-mono text-white/60 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
            claude-opus-4.5
          </div>
        </div>

        {/* snap/constraint indicator - bottom center */}
        <div className="absolute bottom-10 left-[480px] opacity-15">
          <div className="flex items-center gap-2">
            <div className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[8px] font-mono text-white/50 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-cyan-400/70" />
              SNAP
            </div>
            <div className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[8px] font-mono text-white/50 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-400/70" />
              GRID
            </div>
            <div className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[8px] font-mono text-white/50 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400/70" />
              ORTHO
            </div>
          </div>
        </div>

        {/* transformation matrix - top right area below data panel */}
        <div className="absolute top-[310px] right-10 opacity-15 rotate-1">
          <div className="bg-white/5 border border-white/10 rounded-lg p-2 backdrop-blur-sm">
            <div className="text-[7px] font-mono text-white/30 uppercase tracking-wider mb-1">Transform</div>
            <div className="font-mono text-[9px] text-white/50 leading-relaxed">
              <div>[ 0.838 -0.545  0.000 ]</div>
              <div>[ 0.545  0.838  0.000 ]</div>
              <div>[ 0.000  0.000  1.000 ]</div>
            </div>
          </div>
        </div>

        {/* small crosshair decorations scattered */}
        <svg className="absolute top-[140px] left-[550px] opacity-[0.08]" width="30" height="30" viewBox="0 0 30 30">
          <line x1="15" y1="5" x2="15" y2="25" stroke="white" strokeWidth="0.5" />
          <line x1="5" y1="15" x2="25" y2="15" stroke="white" strokeWidth="0.5" />
          <circle cx="15" cy="15" r="6" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
        <svg className="absolute top-[380px] left-[700px] opacity-[0.06]" width="24" height="24" viewBox="0 0 24 24">
          <line x1="12" y1="4" x2="12" y2="20" stroke="white" strokeWidth="0.5" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="white" strokeWidth="0.5" />
          <circle cx="12" cy="12" r="5" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>

        {/* dimension line with arrows - center area */}
        <svg className="absolute top-[420px] left-[280px] opacity-[0.10]" width="200" height="30" viewBox="0 0 200 30">
          <line x1="10" y1="15" x2="190" y2="15" stroke="hsl(170 70% 50%)" strokeWidth="0.7" />
          <polygon points="10,15 16,11 16,19" fill="hsl(170 70% 50%)" />
          <polygon points="190,15 184,11 184,19" fill="hsl(170 70% 50%)" />
          <line x1="10" y1="8" x2="10" y2="22" stroke="hsl(170 70% 50%)" strokeWidth="0.5" />
          <line x1="190" y1="8" x2="190" y2="22" stroke="hsl(170 70% 50%)" strokeWidth="0.5" />
          <text x="85" y="11" fill="hsl(170 70% 50%)" fontSize="8" fontFamily="monospace">400.00</text>
        </svg>

        {/* small parametric equation display */}
        <div className="absolute top-[150px] right-[140px] opacity-[0.12]">
          <div className="font-mono text-[8px] text-white/50 leading-relaxed">
            <div>x(t) = r&middot;cos(t)</div>
            <div>y(t) = r&middot;sin(t)</div>
          </div>
        </div>
      </>
    ),
  },
  f: {
    words: ["PARAMETRIC", "DESIGN", "ENGINE"],
    elements: (
      <>
        {/* dense dot grid background */}
        <svg className="absolute inset-0 opacity-[0.035]" width="1200" height="630">
          <defs>
            <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.8" fill="white" />
            </pattern>
            <pattern id="finegrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="1200" height="630" fill="url(#finegrid)" />
          <rect width="1200" height="630" fill="url(#dotgrid)" />
        </svg>

        {/* ═══ LARGE SVG CONSTRUCTIONS ═══ */}

        {/* involute gear profile - top left */}
        <svg className="absolute -top-16 -left-16 opacity-[0.12]" width="380" height="380" viewBox="0 0 380 380">
          <circle cx="190" cy="190" r="170" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.6" />
          <circle cx="190" cy="190" r="150" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.8" />
          <circle cx="190" cy="190" r="130" fill="none" stroke="hsl(210 80% 45%)" strokeWidth="0.4" strokeDasharray="4 6" />
          <circle cx="190" cy="190" r="100" fill="none" stroke="hsl(210 80% 40%)" strokeWidth="0.3" strokeDasharray="2 4" />
          {/* gear teeth outlines */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16
            const rad = (angle * Math.PI) / 180
            const cos = Math.cos(rad)
            const sin = Math.sin(rad)
            return (
              <line
                key={`gear-${i}`}
                x1={190 + 130 * cos}
                y1={190 + 130 * sin}
                x2={190 + 170 * cos}
                y2={190 + 170 * sin}
                stroke="hsl(210 80% 55%)"
                strokeWidth="0.5"
              />
            )
          })}
          {/* axes */}
          <line x1="0" y1="190" x2="380" y2="190" stroke="hsl(210 80% 50%)" strokeWidth="0.3" strokeDasharray="6 6" />
          <line x1="190" y1="0" x2="190" y2="380" stroke="hsl(210 80% 50%)" strokeWidth="0.3" strokeDasharray="6 6" />
          <circle cx="190" cy="190" r="3" fill="hsl(210 80% 55%)" />
          {/* pressure angle line */}
          <line x1="190" y1="190" x2="310" y2="100" stroke="hsl(40 80% 55%)" strokeWidth="0.6" strokeDasharray="3 3" />
          <text x="270" y="120" fill="hsl(40 80% 55%)" fontSize="7" fontFamily="monospace">20&deg;</text>
        </svg>

        {/* golden spiral - bottom right */}
        <svg className="absolute -bottom-12 -right-10 opacity-[0.14] -rotate-6" width="360" height="360" viewBox="0 0 360 360">
          <path
            d="M 180 180 C 180 120, 240 60, 300 60 C 360 60, 360 120, 360 180 C 360 280, 280 360, 180 360 C 40 360, 0 220, 0 180 C 0 60, 80 0, 180 0"
            fill="none"
            stroke="hsl(45 80% 50%)"
            strokeWidth="1.5"
          />
          {/* golden rectangles */}
          <rect x="180" y="60" width="180" height="120" fill="none" stroke="hsl(45 70% 45%)" strokeWidth="0.4" strokeDasharray="4 4" />
          <rect x="180" y="180" width="180" height="180" fill="none" stroke="hsl(45 70% 45%)" strokeWidth="0.4" strokeDasharray="4 4" />
          <rect x="0" y="180" width="180" height="180" fill="none" stroke="hsl(45 70% 45%)" strokeWidth="0.4" strokeDasharray="4 4" />
          <rect x="0" y="0" width="180" height="180" fill="none" stroke="hsl(45 70% 45%)" strokeWidth="0.4" strokeDasharray="4 4" />
          <text x="160" y="195" fill="hsl(45 80% 50%)" fontSize="8" fontFamily="monospace">&phi;</text>
          <circle cx="180" cy="180" r="2" fill="hsl(45 80% 50%)" />
        </svg>

        {/* ellipse with foci and directrix - center right area */}
        <svg className="absolute top-[100px] right-[120px] opacity-[0.13]" width="220" height="150" viewBox="0 0 220 150">
          <ellipse cx="110" cy="75" rx="100" ry="60" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="1.2" />
          {/* foci */}
          <circle cx="30" cy="75" r="2.5" fill="hsl(350 75% 55%)" />
          <circle cx="190" cy="75" r="2.5" fill="hsl(350 75% 55%)" />
          {/* semi-major axis */}
          <line x1="10" y1="75" x2="210" y2="75" stroke="hsl(280 60% 50%)" strokeWidth="0.4" strokeDasharray="3 4" />
          {/* semi-minor axis */}
          <line x1="110" y1="15" x2="110" y2="135" stroke="hsl(280 60% 50%)" strokeWidth="0.4" strokeDasharray="3 4" />
          {/* focal radii to point on curve */}
          <line x1="30" y1="75" x2="160" y2="28" stroke="hsl(170 70% 50%)" strokeWidth="0.5" strokeDasharray="2 3" />
          <line x1="190" y1="75" x2="160" y2="28" stroke="hsl(170 70% 50%)" strokeWidth="0.5" strokeDasharray="2 3" />
          <circle cx="160" cy="28" r="2" fill="hsl(170 70% 50%)" />
          <text x="65" y="52" fill="hsl(170 70% 50%)" fontSize="7" fontFamily="monospace">r1</text>
          <text x="175" y="45" fill="hsl(170 70% 50%)" fontSize="7" fontFamily="monospace">r2</text>
          {/* labels */}
          <text x="26" y="90" fill="hsl(350 75% 55%)" fontSize="6" fontFamily="monospace">F1</text>
          <text x="186" y="90" fill="hsl(350 75% 55%)" fontSize="6" fontFamily="monospace">F2</text>
        </svg>

        {/* epicycloid curve - left center */}
        <svg className="absolute top-[140px] left-[60px] opacity-[0.10]" width="180" height="180" viewBox="0 0 180 180">
          {/* base circle */}
          <circle cx="90" cy="90" r="50" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.6" strokeDasharray="3 3" />
          {/* rolling circle */}
          <circle cx="90" cy="20" r="20" fill="none" stroke="hsl(350 75% 55%)" strokeWidth="0.5" strokeDasharray="2 3" />
          {/* epicycloid path */}
          <path
            d="M 160 90 C 160 40, 130 10, 90 10 C 50 10, 20 40, 20 90 C 20 140, 50 170, 90 170 C 130 170, 160 140, 160 90"
            fill="none"
            stroke="hsl(280 70% 60%)"
            strokeWidth="1"
          />
          <circle cx="90" cy="90" r="2" fill="hsl(210 80% 55%)" />
        </svg>

        {/* parabola with focus/directrix - bottom left area */}
        <svg className="absolute bottom-[120px] left-[140px] opacity-[0.08]" width="160" height="140" viewBox="0 0 160 140">
          <path d="M 10 130 Q 80 -20 150 130" fill="none" stroke="hsl(170 70% 50%)" strokeWidth="1" />
          {/* directrix */}
          <line x1="0" y1="135" x2="160" y2="135" stroke="hsl(40 80% 55%)" strokeWidth="0.5" strokeDasharray="4 3" />
          {/* focus */}
          <circle cx="80" cy="40" r="2.5" fill="hsl(350 75% 55%)" />
          {/* axis of symmetry */}
          <line x1="80" y1="0" x2="80" y2="140" stroke="hsl(170 60% 45%)" strokeWidth="0.3" strokeDasharray="2 4" />
          <text x="85" y="45" fill="hsl(350 75% 55%)" fontSize="6" fontFamily="monospace">focus</text>
        </svg>

        {/* pentagon with diagonals - top center */}
        <svg className="absolute top-[20px] left-[440px] opacity-[0.09]" width="110" height="110" viewBox="0 0 110 110">
          {/* pentagon vertices: center 55,55 r=48 */}
          <polygon points="55,7 103,42 84,97 26,97 7,42" fill="none" stroke="hsl(210 80% 60%)" strokeWidth="0.8" />
          {/* all diagonals */}
          <line x1="55" y1="7" x2="84" y2="97" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          <line x1="55" y1="7" x2="26" y2="97" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          <line x1="103" y1="42" x2="26" y2="97" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          <line x1="103" y1="42" x2="7" y2="42" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          <line x1="84" y1="97" x2="7" y2="42" stroke="hsl(210 80% 50%)" strokeWidth="0.3" />
          {/* vertex markers */}
          {[[55,7],[103,42],[84,97],[26,97],[7,42]].map(([x,y], i) => (
            <circle key={`pent-${i}`} cx={x} cy={y} r="1.5" fill="hsl(210 80% 60%)" />
          ))}
        </svg>

        {/* isometric wireframe block - bottom center-right */}
        <svg className="absolute bottom-[30px] left-[520px] opacity-[0.08]" width="140" height="150" viewBox="0 0 140 150">
          <polygon points="70,5 135,40 135,110 70,145 5,110 5,40" fill="none" stroke="hsl(170 70% 50%)" strokeWidth="0.8" />
          <line x1="70" y1="5" x2="70" y2="75" stroke="hsl(170 70% 50%)" strokeWidth="0.5" />
          <line x1="5" y1="40" x2="70" y2="75" stroke="hsl(170 70% 50%)" strokeWidth="0.5" />
          <line x1="135" y1="40" x2="70" y2="75" stroke="hsl(170 70% 50%)" strokeWidth="0.5" />
          <line x1="70" y1="75" x2="70" y2="145" stroke="hsl(170 70% 50%)" strokeWidth="0.3" strokeDasharray="3 3" />
          <line x1="70" y1="75" x2="5" y2="110" stroke="hsl(170 70% 50%)" strokeWidth="0.3" strokeDasharray="3 3" />
          <line x1="70" y1="75" x2="135" y2="110" stroke="hsl(170 70% 50%)" strokeWidth="0.3" strokeDasharray="3 3" />
        </svg>

        {/* bezier surface patch wireframe - right */}
        <svg className="absolute top-[260px] right-[40px] opacity-[0.09]" width="160" height="120" viewBox="0 0 160 120">
          {/* horizontal curves */}
          <path d="M 10 20 C 50 5, 110 5, 150 20" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="0.6" />
          <path d="M 5 50 C 50 30, 110 30, 155 50" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="0.6" />
          <path d="M 8 80 C 50 60, 110 65, 152 80" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="0.6" />
          <path d="M 12 110 C 50 95, 110 100, 148 110" fill="none" stroke="hsl(280 70% 60%)" strokeWidth="0.6" />
          {/* vertical curves */}
          <path d="M 10 20 C 5 40, 8 70, 12 110" fill="none" stroke="hsl(280 60% 50%)" strokeWidth="0.4" />
          <path d="M 60 10 C 55 35, 55 65, 58 105" fill="none" stroke="hsl(280 60% 50%)" strokeWidth="0.4" />
          <path d="M 100 10 C 105 35, 103 68, 100 105" fill="none" stroke="hsl(280 60% 50%)" strokeWidth="0.4" />
          <path d="M 150 20 C 155 45, 152 75, 148 110" fill="none" stroke="hsl(280 60% 50%)" strokeWidth="0.4" />
          {/* control points */}
          {[[10,20],[60,10],[100,10],[150,20],[5,50],[155,50],[8,80],[152,80],[12,110],[58,105],[100,105],[148,110]].map(([x,y], i) => (
            <circle key={`bp-${i}`} cx={x} cy={y} r="1.5" fill="hsl(280 70% 60%)" />
          ))}
        </svg>

        {/* dimension lines with GD&T callout - center */}
        <svg className="absolute top-[460px] left-[320px] opacity-[0.10]" width="240" height="40" viewBox="0 0 240 40">
          <line x1="10" y1="20" x2="230" y2="20" stroke="hsl(170 70% 50%)" strokeWidth="0.7" />
          <polygon points="10,20 16,16 16,24" fill="hsl(170 70% 50%)" />
          <polygon points="230,20 224,16 224,24" fill="hsl(170 70% 50%)" />
          <line x1="10" y1="10" x2="10" y2="30" stroke="hsl(170 70% 50%)" strokeWidth="0.5" />
          <line x1="230" y1="10" x2="230" y2="30" stroke="hsl(170 70% 50%)" strokeWidth="0.5" />
          <text x="95" y="15" fill="hsl(170 70% 50%)" fontSize="8" fontFamily="monospace">438.20 &plusmn;0.05</text>
        </svg>

        {/* tangent line construction */}
        <svg className="absolute top-[340px] left-[100px] opacity-[0.07]" width="120" height="100" viewBox="0 0 120 100">
          <circle cx="60" cy="50" r="35" fill="none" stroke="hsl(210 80% 60%)" strokeWidth="0.8" />
          {/* tangent line */}
          <line x1="0" y1="85" x2="120" y2="15" stroke="hsl(350 75% 55%)" strokeWidth="0.6" />
          {/* tangent point */}
          <circle cx="85" cy="32" r="2" fill="hsl(350 75% 55%)" />
          {/* radius to tangent point */}
          <line x1="60" y1="50" x2="85" y2="32" stroke="hsl(40 80% 55%)" strokeWidth="0.4" strokeDasharray="2 3" />
          {/* right angle marker */}
          <rect x="80" y="30" width="5" height="5" fill="none" stroke="hsl(40 80% 55%)" strokeWidth="0.5" transform="rotate(-25 82.5 32.5)" />
        </svg>

        {/* crosshairs scattered */}
        {[[540, 130], [780, 400], [650, 500], [900, 200]].map(([x, y], i) => (
          <svg key={`xhair-${i}`} className="absolute opacity-[0.06]" style={{ top: y, left: x }} width="20" height="20" viewBox="0 0 20 20">
            <line x1="10" y1="2" x2="10" y2="18" stroke="white" strokeWidth="0.5" />
            <line x1="2" y1="10" x2="18" y2="10" stroke="white" strokeWidth="0.5" />
            <circle cx="10" cy="10" r="4" fill="none" stroke="white" strokeWidth="0.4" />
          </svg>
        ))}

        {/* ═══ UI PANELS ═══ */}

        {/* properties inspector - top right */}
        <div className="absolute top-6 right-6 opacity-55 rotate-1">
          <div className="bg-white/5 border border-white/15 rounded-xl p-4 backdrop-blur-sm w-[210px]">
            <div className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-2.5">Properties</div>
            <div className="flex flex-col gap-1 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-white/35">type</span>
                <span className="text-blue-400/70">GearProfile</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">module</span>
                <span className="text-white/75 tabular-nums">2.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">teeth</span>
                <span className="text-white/75 tabular-nums">16</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">pressureAngle</span>
                <span className="text-white/75 tabular-nums">20.00&deg;</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">pitchDiameter</span>
                <span className="text-white/75 tabular-nums">300.00</span>
              </div>
              <div className="h-px bg-white/8 my-1" />
              <div className="text-[8px] font-mono text-white/25 uppercase tracking-widest mb-1">Tolerance</div>
              <div className="flex justify-between">
                <span className="text-white/35">class</span>
                <span className="text-emerald-400/70">ISO 1328-1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">grade</span>
                <span className="text-white/75 tabular-nums">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/35">runout</span>
                <span className="text-white/75 tabular-nums">&plusmn;0.012</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI tool call sequence - bottom left */}
        <div className="absolute bottom-8 left-6 opacity-55 -rotate-1">
          <div className="flex flex-col gap-1.5 w-[260px]">
            <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest ml-1">Agent Pipeline</div>
            <div className="bg-white/5 border border-white/12 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-2">
              <span className="text-[9px] font-mono text-emerald-400/40">01</span>
              <span className="text-[10px] font-mono text-white/70">createGearProfile(16, 2.5)</span>
            </div>
            <div className="bg-white/5 border border-white/12 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-2">
              <span className="text-[9px] font-mono text-emerald-400/40">02</span>
              <span className="text-[10px] font-mono text-white/70">addGoldenSpiral(origin, 5)</span>
            </div>
            <div className="bg-white/5 border border-white/12 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-2">
              <span className="text-[9px] font-mono text-emerald-400/40">03</span>
              <span className="text-[10px] font-mono text-white/70">constrainTangent(e1, e2)</span>
            </div>
            <div className="bg-white/5 border border-white/12 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-2">
              <span className="text-[9px] font-mono text-emerald-400/40">04</span>
              <span className="text-[10px] font-mono text-white/70">fitEllipse(foci, 100, 60)</span>
            </div>
            <div className="bg-white/5 border border-emerald-500/20 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="text-[9px] font-mono text-emerald-400/70">{"{ ok: true, entities: 4, constraints: 7 }"}</span>
            </div>
          </div>
        </div>

        {/* constraint icons panel - left edge */}
        <div className="absolute top-[160px] left-4 opacity-20">
          <div className="bg-white/5 border border-white/10 rounded-lg p-1.5 flex flex-col gap-0.5 backdrop-blur-sm">
            <div className="text-[6px] font-mono text-white/25 uppercase tracking-wider text-center mb-0.5">Constraints</div>
            {[
              { icon: "∥", label: "PAR" },
              { icon: "⊥", label: "PRP" },
              { icon: "⊙", label: "TAN" },
              { icon: "◎", label: "CON" },
              { icon: "⊕", label: "FIX" },
              { icon: "≡", label: "EQL" },
              { icon: "∠", label: "ANG" },
            ].map((c) => (
              <div key={c.label} className="w-7 h-5 rounded flex items-center justify-center text-white/40 text-[10px]" title={c.label}>
                {c.icon}
              </div>
            ))}
          </div>
        </div>

        {/* layers/entity tree - right side */}
        <div className="absolute top-[260px] right-6 opacity-20 -rotate-1">
          <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 backdrop-blur-sm w-[140px]">
            <div className="text-[7px] font-mono text-white/25 uppercase tracking-widest mb-1.5">Entity Tree</div>
            <div className="flex flex-col gap-1 text-[8px] font-mono text-white/45">
              <div className="flex items-center gap-1.5">
                <span className="text-blue-400/60">&#9656;</span>
                <span>GearProfile_01</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3">
                <span className="text-white/20">&#9656;</span>
                <span className="text-white/30">PitchCircle</span>
              </div>
              <div className="flex items-center gap-1.5 pl-3">
                <span className="text-white/20">&#9656;</span>
                <span className="text-white/30">ToothProfile[16]</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400/60">&#9656;</span>
                <span>GoldenSpiral_01</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400/60">&#9656;</span>
                <span>Ellipse_01</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-red-400/60">&#9656;</span>
                <span>TangentLine_01</span>
              </div>
            </div>
          </div>
        </div>

        {/* coordinate / cursor readout - top left area */}
        <div className="absolute top-8 left-[310px] opacity-20">
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 backdrop-blur-sm flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono text-red-400/60">X</span>
              <span className="text-[9px] font-mono text-white/60 tabular-nums">312.75</span>
            </div>
            <div className="w-px h-3 bg-white/8" />
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono text-green-400/60">Y</span>
              <span className="text-[9px] font-mono text-white/60 tabular-nums">184.50</span>
            </div>
            <div className="w-px h-3 bg-white/8" />
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-mono text-blue-400/60">Z</span>
              <span className="text-[9px] font-mono text-white/60 tabular-nums">0.00</span>
            </div>
          </div>
        </div>

        {/* parametric code editor snippet - top center area */}
        <div className="absolute top-[52px] left-[300px] opacity-15">
          <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 backdrop-blur-sm font-mono text-[8px] leading-relaxed">
            <div><span className="text-purple-400/60">fn</span> <span className="text-blue-400/60">involute</span><span className="text-white/40">(t: f64) -&gt; Vec2 {"{"}</span></div>
            <div className="text-white/40 pl-3">r * (t.cos() + t * t.sin(),</div>
            <div className="text-white/40 pl-3">{"     "}t.sin() - t * t.cos())</div>
            <div className="text-white/40">{"}"}</div>
          </div>
        </div>

        {/* performance / stats bar - bottom center */}
        <div className="absolute bottom-8 left-[380px] opacity-15">
          <div className="flex items-center gap-3 text-[7px] font-mono text-white/40">
            <div className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400/60" />
              <span>60 FPS</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <span>entities: 47</span>
            <div className="w-px h-3 bg-white/10" />
            <span>constraints: 23</span>
            <div className="w-px h-3 bg-white/10" />
            <span>render: 2.1ms</span>
          </div>
        </div>

        {/* export chips - top area */}
        <div className="absolute top-[100px] left-[310px] opacity-15 flex gap-1.5">
          <div className="bg-white/6 border border-white/10 rounded-md px-2 py-0.5 text-[8px] font-mono text-white/45">STEP</div>
          <div className="bg-white/6 border border-white/10 rounded-md px-2 py-0.5 text-[8px] font-mono text-white/45">IGES</div>
          <div className="bg-white/6 border border-white/10 rounded-md px-2 py-0.5 text-[8px] font-mono text-white/45">DXF</div>
          <div className="bg-white/6 border border-white/10 rounded-md px-2 py-0.5 text-[8px] font-mono text-white/45">STL</div>
          <div className="bg-white/6 border border-white/10 rounded-md px-2 py-0.5 text-[8px] font-mono text-white/45">glTF</div>
        </div>

        {/* model chip - bottom right area */}
        <div className="absolute bottom-8 right-[220px] opacity-15">
          <div className="bg-white/6 border border-white/10 rounded-full px-3 py-1 text-[8px] font-mono text-white/45 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
            claude-opus-4.5
          </div>
        </div>

        {/* snap/mode indicators - bottom center-left */}
        <div className="absolute bottom-[50px] left-[380px] opacity-12">
          <div className="flex items-center gap-1.5">
            {[
              { label: "SNAP", color: "bg-cyan-400/60" },
              { label: "GRID", color: "bg-amber-400/60" },
              { label: "ORTHO", color: "bg-emerald-400/60" },
              { label: "POLAR", color: "bg-purple-400/60" },
              { label: "OSNAP", color: "bg-rose-400/60" },
            ].map((m) => (
              <div key={m.label} className="bg-white/5 border border-white/8 rounded px-1.5 py-0.5 text-[7px] font-mono text-white/40 flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${m.color}`} />
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* transformation matrix - right area */}
        <div className="absolute top-[420px] right-8 opacity-[0.11]">
          <div className="bg-white/5 border border-white/8 rounded-lg p-2 backdrop-blur-sm">
            <div className="text-[6px] font-mono text-white/25 uppercase tracking-widest mb-1">4x4 Transform</div>
            <div className="font-mono text-[7px] text-white/40 leading-relaxed tabular-nums">
              <div>[ 0.940 -0.342  0.000  312.7 ]</div>
              <div>[ 0.342  0.940  0.000  184.5 ]</div>
              <div>[ 0.000  0.000  1.000    0.0 ]</div>
              <div>[ 0.000  0.000  0.000    1.0 ]</div>
            </div>
          </div>
        </div>

        {/* history panel snippet - left lower */}
        <div className="absolute bottom-[140px] left-6 opacity-15">
          <div className="bg-white/5 border border-white/8 rounded-lg p-2 backdrop-blur-sm w-[130px]">
            <div className="text-[6px] font-mono text-white/25 uppercase tracking-widest mb-1">History</div>
            <div className="flex flex-col gap-0.5 text-[7px] font-mono text-white/35">
              <div className="flex items-center gap-1"><span className="text-white/20">12</span> CreateGear</div>
              <div className="flex items-center gap-1"><span className="text-white/20">13</span> AddSpiral</div>
              <div className="flex items-center gap-1"><span className="text-white/20">14</span> FitEllipse</div>
              <div className="flex items-center gap-1 text-white/55"><span className="text-white/30">15</span> Tangent &larr;</div>
            </div>
          </div>
        </div>

        {/* angle annotation floating */}
        <svg className="absolute top-[200px] left-[500px] opacity-[0.09]" width="70" height="70" viewBox="0 0 70 70">
          <path d="M 10 60 L 60 60" stroke="hsl(40 80% 55%)" strokeWidth="1" />
          <path d="M 10 60 L 50 12" stroke="hsl(40 80% 55%)" strokeWidth="1" />
          <path d="M 30 60 A 20 20 0 0 0 34 40" fill="none" stroke="hsl(40 80% 55%)" strokeWidth="0.8" />
          <text x="37" y="50" fill="hsl(40 80% 55%)" fontSize="7" fontFamily="monospace">20&deg;</text>
          <circle cx="10" cy="60" r="1.5" fill="hsl(40 80% 55%)" />
        </svg>

        {/* surface normal arrows */}
        <svg className="absolute top-[370px] left-[620px] opacity-[0.06]" width="60" height="80" viewBox="0 0 60 80">
          <path d="M 10 70 Q 30 20 50 70" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="0.8" />
          <line x1="30" y1="38" x2="30" y2="5" stroke="hsl(350 75% 55%)" strokeWidth="0.6" />
          <polygon points="30,5 27,12 33,12" fill="hsl(350 75% 55%)" />
          <text x="34" y="10" fill="hsl(350 75% 55%)" fontSize="6" fontFamily="monospace">n</text>
        </svg>
      </>
    ),
  },
}

export function Thumbnail({ variant = "a" }: ThumbnailProps) {
  const v = VARIANTS[variant]

  return (
    <div
      className="relative overflow-hidden bg-primary"
      style={{ width: 1200, height: 630 }}
    >
      {v.elements}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        {v.words.map((word) => (
          <span
            key={word}
            className="font-mono font-black text-primary-foreground tracking-tighter leading-none"
            style={{ fontSize: variant === "e" || variant === "f" ? "6.5rem" : "8rem" }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  )
}
