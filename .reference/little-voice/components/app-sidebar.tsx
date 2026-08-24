"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { primaryNav, menuNav } from "@/lib/nav-config"
import { BrandMark } from "@/components/brand-mark"
import { useAuth } from "@/lib/auth-context"

export function AppSidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const router = useRouter()

  const items = [...primaryNav, ...menuNav.filter((m) => !primaryNav.some((p) => p.href === m.href))]

  async function handleLogout() {
    await logout()
    router.replace("/")
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-white/5 backdrop-blur-2xl md:flex">
      <div className="flex h-20 items-center border-b border-white/10 px-6">
        <BrandMark />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3.5 rounded-2xl border border-transparent px-4 py-3 font-sans text-sm transition-all duration-200",
                active
                  ? "border-white/10 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-foreground shadow-[0_8px_24px_-10px_oklch(0.64_0.2_290_/_45%)]"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-gradient-to-b from-primary to-accent shadow-[0_0_10px_oklch(0.64_0.2_290_/_70%)]" />
              )}
              <item.icon
                className={cn(
                  "h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110",
                  active && "text-primary",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-3 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-sans text-xs font-semibold text-primary-foreground">
            {(user?.email ?? "A")[0]?.toUpperCase()}
          </span>
          <span className="truncate font-sans text-xs text-muted-foreground">{user?.email ?? "Admin"}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="group flex items-center gap-3 rounded-xl px-4 py-2.5 font-sans text-sm text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
