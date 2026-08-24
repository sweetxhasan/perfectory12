"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "@/components/app-sidebar"
import { BottomNav } from "@/components/bottom-nav"

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/")
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh w-full">
      <AppSidebar />

      <main className="flex flex-col gap-6 px-4 pb-24 pt-6 md:ml-64 md:px-8 md:pb-10 md:pt-8">{children}</main>

      <BottomNav />
    </div>
  )
}
