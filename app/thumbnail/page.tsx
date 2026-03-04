import { Thumbnail } from "@/components/brand/thumbnail"

type Variant = "a" | "b" | "c" | "d" | "e" | "f"
const VALID: Variant[] = ["a", "b", "c", "d", "e", "f"]

export default async function ThumbnailPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>
}) {
  const { v } = await searchParams
  const variant: Variant = VALID.includes(v as Variant) ? (v as Variant) : "a"

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Thumbnail variant={variant} />
    </div>
  )
}
