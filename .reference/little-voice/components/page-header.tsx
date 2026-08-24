import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
      <div className="flex flex-col items-center gap-1.5 sm:items-start">
        <h1 className="text-balance font-serif text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-pretty font-sans text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
