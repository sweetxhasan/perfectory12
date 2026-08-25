"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, ChevronRight } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { menuNav } from "@/lib/nav-config"
import { useAuth } from "@/lib/auth-context"
import { BrandMark } from "@/components/brand-mark"

export function MenuSheet({ trigger, className }: { trigger: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  const { logout, user } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    setOpen(false)
    router.replace("/")
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className={className}>
        {trigger}
      </div>
      <SheetContent
        side="right"
        className="glass-strong rounded-l-3xl border-l border-white/10 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-white/10 p-6">
          <BrandMark />
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SheetDescription className="mt-2 font-sans text-xs">
            Signed in as {user?.email ?? "admin"}
          </SheetDescription>
        </SheetHeader>

        <nav className="flex flex-col gap-2 p-4">
          {menuNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="group flex items-center gap-4 rounded-2xl border border-transparent bg-white/5 p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/10"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/25 to-accent/15 text-primary transition-transform duration-200 group-hover:scale-110">
                <item.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="font-serif text-sm font-semibold text-foreground">{item.label}</span>
                <span className="font-sans text-xs leading-relaxed text-muted-foreground">{item.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="group mt-auto flex items-center gap-3 border-t border-white/10 p-6 font-sans text-sm text-destructive"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
          Sign out
        </button>
      </SheetContent>
    </Sheet>
  )
}
