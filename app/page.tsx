import Link from "next/link"
import {
  ArrowRight,
  Circle,
  FileText,
  FolderOpen,
  Ruler,
  Upload,
  BarChart3,
  Layers,
  Cpu,
  Download,
  Search,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const QS_FEATURES = [
  {
    icon: Upload,
    title: "PDF Upload & Extraction",
    description:
      "Upload architectural PDFs. The system splits them into pages and extracts rooms, dimensions, and notes automatically.",
  },
  {
    icon: Layers,
    title: "Multi-File Projects",
    description:
      "Organize drawings by project with multiple PDF files. Each file is split into pages with individual status tracking.",
  },
  {
    icon: Ruler,
    title: "Measurement & Annotation",
    description:
      "Draw circles, triangles, lines, and measurement callouts directly on the drawing canvas. All annotations auto-save.",
  },
  {
    icon: Search,
    title: "Room Detection",
    description:
      "Automatically detect and label rooms with area, perimeter, and type classification. Edit and verify each room.",
  },
  {
    icon: BarChart3,
    title: "QS Summary Dashboard",
    description:
      "Full quantity surveying overview: total units, rooms, bathrooms, kitchens, electrical sockets, doors, windows, and more.",
  },
  {
    icon: Download,
    title: "Export Schedules",
    description:
      "Export room schedules, dimension tables, and MEP counts as CSV, Excel, or PDF. Ready for client handover.",
  },
]

const TECH = [
  "Next.js 16",
  "React 19",
  "Tailwind CSS",
  "shadcn/ui",
  "AI SDK 6",
  "Canvas API",
  "TypeScript",
  "Lucide Icons",
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* hero */}
      <section className="px-4 pt-12 pb-8 md:pt-20 md:pb-12 max-w-4xl mx-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground tracking-tight">QSME</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-card">
              v0.1
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight text-balance">
            Quantity Surveying Made Easy
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl text-pretty leading-relaxed">
            Upload architectural drawings, extract rooms and dimensions, annotate and measure, then export professional schedules. All in your browser.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <Link href="/projects">
              <Button size="lg" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                View Projects
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/projects/proj-1">
              <Button size="lg" variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Open Demo Project
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* workflow steps */}
      <section className="px-4 max-w-4xl mx-auto pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { step: "01", label: "Upload PDFs", icon: Upload, desc: "Drag and drop architectural drawing files" },
            { step: "02", label: "Extract Data", icon: Cpu, desc: "Auto-detect rooms, dimensions, and notes" },
            { step: "03", label: "Review & Annotate", icon: CheckCircle2, desc: "Verify and add measurements on canvas" },
            { step: "04", label: "Export Schedules", icon: Download, desc: "CSV, Excel, or PDF quantity reports" },
          ].map((item) => (
            <div
              key={item.step}
              className="border border-border rounded-lg p-4 bg-card flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-muted-foreground">{item.step}</span>
                <item.icon className="h-4 w-4 text-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* feature cards */}
      <section className="px-4 max-w-4xl mx-auto pb-12">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Features
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QS_FEATURES.map((f) => (
            <div
              key={f.title}
              className="border border-border rounded-lg p-4 flex flex-col gap-2 bg-card"
            >
              <div className="flex items-center gap-2">
                <f.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{f.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* tech stack */}
      <section className="px-4 max-w-4xl mx-auto pb-12">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Tech Stack
        </h2>
        <div className="flex flex-wrap gap-2">
          {TECH.map((t) => (
            <span
              key={t}
              className="text-xs font-mono px-2.5 py-1 rounded-full border border-border text-muted-foreground bg-card"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* explore cards */}
      <section className="px-4 max-w-4xl mx-auto pb-16">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Explore
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/projects"
            className="group border border-border rounded-lg p-5 flex flex-col gap-2 hover:border-foreground/20 transition-colors bg-card"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-foreground" />
              <span className="text-base font-semibold text-foreground">Projects</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Browse all projects. Upload PDFs, run extractions, and manage quantity surveys.
            </p>
            <span className="text-xs text-muted-foreground group-hover:text-foreground mt-1 flex items-center gap-1 transition-colors">
              Open <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <Link
            href="/projects/proj-1/summary"
            className="group border border-border rounded-lg p-5 flex flex-col gap-2 hover:border-foreground/20 transition-colors bg-card"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-foreground" />
              <span className="text-base font-semibold text-foreground">QS Summary</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              View the full quantity surveying dashboard for the demo residential project.
            </p>
            <span className="text-xs text-muted-foreground group-hover:text-foreground mt-1 flex items-center gap-1 transition-colors">
              View <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
          <Link
            href="/tool"
            className="group border border-border rounded-lg p-5 flex flex-col gap-2 hover:border-foreground/20 transition-colors bg-card"
          >
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-foreground" />
              <span className="text-base font-semibold text-foreground">Circle Tool</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The original circle geometry editor with AI chatbot. Draw, compute, and export.
            </p>
            <span className="text-xs text-muted-foreground group-hover:text-foreground mt-1 flex items-center gap-1 transition-colors">
              Open <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  )
}
