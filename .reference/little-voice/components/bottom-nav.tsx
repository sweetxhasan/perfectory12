"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { primaryNav } from "@/lib/nav-config"
import { MenuSheet } from "@/components/menu-sheet"

function NavItemShell({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "relative flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 py-2.5",
      )}
    >
      {children}
    </span>
  )
}

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  active: boolean
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
        active
          ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_4px_16px_oklch(0.64_0.2_290_/_55%)]"
          : "text-muted-foreground hover:scale-110",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
    </span>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-x border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex w-full max-w-md items-stretch">
        {primaryNav.map((item) => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className="flex min-w-0 flex-1 basis-0">
              <NavItemShell active={active}>
                <NavIcon icon={item.icon} active={active} />
                {!active && (
                  <span className="w-full truncate text-center font-sans text-[10px] leading-none tracking-wide text-muted-foreground transition-colors">
                    {item.label}
                  </span>
                )}
              </NavItemShell>
            </Link>
          )
        })}

        <Link href="/settings" className="flex min-w-0 flex-1 basis-0">
          <NavItemShell active={pathname === "/settings"}>
            <NavIcon icon={Settings} active={pathname === "/settings"} />
            {pathname !== "/settings" && (
              <span className="w-full truncate text-center font-sans text-[10px] leading-none tracking-wide text-muted-foreground transition-colors">
                Settings
              </span>
            )}
          </NavItemShell>
        </Link>

        <MenuSheet
          className="flex min-w-0 flex-1 basis-0"
          trigger={
            <button type="button" className="flex min-w-0 flex-1 basis-0">
              <NavItemShell active={false}>
                <NavIcon icon={Menu} active={false} />
                <span className="w-full truncate text-center font-sans text-[10px] leading-none tracking-wide text-muted-foreground">
                  Menu
                </span>
              </NavItemShell>
            </button>
          }
        />
      </div>
    </nav>
  )
}
