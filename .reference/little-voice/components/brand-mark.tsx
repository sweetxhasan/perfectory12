import Image from "next/image"
import { cn } from "@/lib/utils"

/**
 * The single source of truth for the "Little Voice" wordmark + icon,
 * rendered everywhere the brand appears (sidebar, menu sheet, sign-in
 * screen, preloader). The icon graphic itself is the premium badge in
 * /public/icon.svg — swapping that file updates the mark across every
 * position at once.
 */
export function BrandMark({
  className,
  iconOnly,
  size = "md",
}: {
  className?: string
  iconOnly?: boolean
  size?: "sm" | "md" | "lg"
}) {
  const badgeSize = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-9 w-9"
  const imageSize = size === "lg" ? 56 : size === "sm" ? 32 : 36
  const textSize = size === "lg" ? "text-xl" : "text-lg"

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-[0_8px_20px_-6px_oklch(0.64_0.2_290_/_65%)]",
          badgeSize,
        )}
      >
        <Image src="/icon.svg" alt="" width={imageSize} height={imageSize} className="h-full w-full" priority />
      </span>
      {!iconOnly && (
        <span className={cn("font-serif font-semibold leading-none text-foreground", textSize)}>
          Little Voice <span className="text-primary">API</span>
        </span>
      )}
    </div>
  )
}
