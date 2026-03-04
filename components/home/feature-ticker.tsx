"use client"

const FEATURES = [
  {
    label: "Canvas Renderer",
    mini: (
      <div className="flex flex-col gap-1">
        <div className="w-full h-12 rounded border border-border relative overflow-hidden bg-card">
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-4 gap-px opacity-30">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="bg-muted-foreground rounded-full w-0.5 h-0.5 m-auto" />
            ))}
          </div>
          <svg viewBox="0 0 80 48" className="absolute inset-0 w-full h-full">
            <circle cx="40" cy="24" r="16" fill="none" stroke="hsl(210 80% 55%)" strokeWidth="1.5" opacity="0.8" />
            <circle cx="40" cy="24" r="1.5" fill="hsl(210 80% 55%)" />
          </svg>
        </div>
      </div>
    ),
  },
  {
    label: "Geometry Engine",
    mini: (
      <div className="flex flex-col gap-0.5 text-[9px] font-mono">
        {[
          { k: "Circumference", v: "628.3" },
          { k: "Area", v: "31415.9" },
          { k: "Sagitta", v: "13.4" },
          { k: "Arc Length", v: "167.6" },
        ].map(({ k, v }) => (
          <div key={k} className="flex justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "AI Chatbot",
    mini: (
      <div className="flex flex-col gap-1">
        <div className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[9px] ml-4 self-end">
          Draw a circle 300px
        </div>
        <div className="bg-muted rounded px-1.5 py-0.5 text-[9px] mr-4 self-start text-foreground">
          Done. Added circle d=300
        </div>
        <div className="bg-muted rounded h-5 mr-4 self-start flex items-center px-1.5">
          <div className="flex gap-0.5">
            <div className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse" />
            <div className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "150ms" }} />
            <div className="w-1 h-1 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "Model Picker",
    mini: (
      <div className="flex flex-col gap-0.5">
        {["Opus 4.5", "Sonnet 4", "Haiku 3.5"].map((m, i) => (
          <div
            key={m}
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
              i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {m}
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "Tool Calling",
    mini: (
      <div className="flex flex-col gap-0.5 text-[9px] font-mono">
        {["setCircle()", "setLine()", "removeCircle()", "removeLine()"].map((t) => (
          <div key={t} className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
            {t}
          </div>
        ))}
      </div>
    ),
  },
  {
    label: "Chord Sliders",
    mini: (
      <div className="flex flex-col gap-1.5 py-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] text-muted-foreground">Length</span>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "65%" }} />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] text-muted-foreground">Angle</span>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "40%" }} />
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "Export Image",
    mini: (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <div className="text-[9px] font-mono px-1.5 py-0.5 bg-primary text-primary-foreground rounded">
            JPG
          </div>
          <div className="text-[9px] font-mono px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
            PNG
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] text-muted-foreground">Quality 90%</span>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "90%" }} />
          </div>
        </div>
        <span className="text-[8px] text-muted-foreground">Scale: 2x (1600px)</span>
      </div>
    ),
  },
  {
    label: "Copy Data",
    mini: (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <div className="text-[9px] font-mono px-1.5 py-0.5 bg-primary text-primary-foreground rounded">
            JSON
          </div>
          <div className="text-[9px] font-mono px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
            CSV
          </div>
        </div>
        <pre className="text-[7px] font-mono bg-muted rounded p-1 text-muted-foreground leading-tight overflow-hidden">
          {`{ "diameter": 200,\n  "radius": 100 }`}
        </pre>
      </div>
    ),
  },
  {
    label: "Responsive Layout",
    mini: (
      <div className="flex gap-1.5 items-end">
        <div className="w-4 h-8 border border-border rounded-sm flex flex-col">
          <div className="h-1 bg-muted border-b border-border" />
          <div className="flex-1" />
        </div>
        <div className="w-10 h-6 border border-border rounded-sm flex">
          <div className="w-2 border-r border-border bg-muted" />
          <div className="flex-1" />
          <div className="w-2 border-l border-border bg-muted" />
        </div>
      </div>
    ),
  },
  {
    label: "Design Tokens",
    mini: (
      <div className="grid grid-cols-4 gap-1">
        {[
          "bg-background", "bg-primary", "bg-muted", "bg-card",
          "bg-secondary", "bg-accent", "bg-border", "bg-destructive",
        ].map((c) => (
          <div key={c} className={`w-4 h-4 rounded-sm border border-border ${c}`} />
        ))}
      </div>
    ),
  },
]

function TickerCard({
  label,
  mini,
}: {
  label: string
  mini: React.ReactNode
}) {
  return (
    <div className="w-[260px] shrink-0 border border-border rounded-lg bg-card p-3 flex flex-col gap-2">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">
        {label}
      </span>
      <div className="min-h-[60px] flex flex-col justify-center">{mini}</div>
    </div>
  )
}

export function FeatureTicker() {
  return (
    <div className="relative w-full overflow-hidden border-y border-border bg-card/50 py-4">
      {/* fade masks */}
      <div className="absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />

      <div
        className="flex gap-4 w-max hover:[animation-play-state:paused]"
        style={{
          animation: "ticker-scroll 45s linear infinite",
        }}
      >
        {/* duplicate for seamless loop */}
        {[...FEATURES, ...FEATURES].map((f, i) => (
          <TickerCard key={`${f.label}-${i}`} label={f.label} mini={f.mini} />
        ))}
      </div>
    </div>
  )
}
