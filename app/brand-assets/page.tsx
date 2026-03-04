import Link from "next/link"
import { ChevronRight, ExternalLink } from "lucide-react"
import { Thumbnail } from "@/components/brand/thumbnail"

type Variant = "a" | "b" | "c" | "d" | "e" | "f"
const VARIANTS: { id: Variant; label: string }[] = [
  { id: "f", label: "Parametric Engine" },
  { id: "e", label: "CAD Geometry Tool" },
  { id: "a", label: "Circle Tool" },
  { id: "b", label: "AI Agent" },
  { id: "c", label: "Geometry" },
  { id: "d", label: "Export" },
]

function AppleTouchIcon() {
  return (
    <div
      className="rounded-[20%] bg-primary flex items-center justify-center overflow-hidden"
      style={{ width: 180, height: 180 }}
    >
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="40" fill="none" stroke="hsl(210 80% 65%)" strokeWidth="3" />
        <circle cx="60" cy="60" r="4" fill="hsl(210 80% 65%)" />
        <line x1="28" y1="80" x2="92" y2="40" stroke="hsl(350 75% 55%)" strokeWidth="2.5" />
      </svg>
    </div>
  )
}

function Favicon({ size }: { size: 32 | 16 }) {
  return (
    <div
      className="bg-primary flex items-center justify-center rounded-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.75} height={size * 0.75} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="hsl(210 80% 65%)" strokeWidth="1.5" />
        <line x1="5" y1="17" x2="19" y2="7" stroke="hsl(350 75% 55%)" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

export default function BrandAssetsPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Circle Tool
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground">Brand Assets</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-12">
        {/* Thumbnails */}
        <section>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Thumbnails
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            1200 x 630px. For marketplace listings and social sharing.
          </p>
          <div className="flex flex-col gap-6">
            {VARIANTS.map((v) => (
              <div key={v.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">{v.label}</span>
                  <Link
                    href={`/thumbnail?v=${v.id}`}
                    target="_blank"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    Full size <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="rounded-lg border border-border overflow-hidden" style={{ maxWidth: 600, height: 315 }}>
                  <div style={{ transform: "scale(0.5)", transformOrigin: "top left", width: 1200, height: 630 }}>
                    <Thumbnail variant={v.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* OG Image */}
        <section>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            OpenGraph (OG) Image
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            The preview image for social media and Slack shares. Uses the Circle Tool thumbnail variant at 1200 x 630px.
          </p>
          <div className="rounded-lg border border-border overflow-hidden" style={{ maxWidth: 600, height: 315 }}>
            <div style={{ transform: "scale(0.5)", transformOrigin: "top left", width: 1200, height: 630 }}>
              <Thumbnail variant="a" />
            </div>
          </div>
        </section>

        {/* Apple Touch Icon */}
        <section>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Apple Touch Icon
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            180 x 180px. Primary color background with circle-and-chord glyph.
          </p>
          <AppleTouchIcon />
        </section>

        {/* Favicons */}
        <section>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Favicons
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            32 x 32px and 16 x 16px.
          </p>
          <div className="flex items-end gap-4">
            <div className="flex flex-col items-center gap-1">
              <Favicon size={32} />
              <span className="text-[10px] font-mono text-muted-foreground">32px</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Favicon size={16} />
              <span className="text-[10px] font-mono text-muted-foreground">16px</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
