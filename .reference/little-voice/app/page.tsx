"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Globe2, KeyRound, ShieldCheck } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { GlassPanel } from "@/components/glass-panel"
import { BrandMark } from "@/components/brand-mark"
import { LoginForm } from "@/components/login-form"

const highlights = [
  {
    icon: Globe2,
    title: "Every Indian language, one endpoint",
    body: "Route text in Hindi, Bengali, Tamil and more through a single, unified voice API.",
  },
  {
    icon: KeyRound,
    title: "Self-healing key rotation",
    body: "Admin-managed key pool automatically rotates on failure so requests never go down.",
  },
  {
    icon: ShieldCheck,
    title: "Production grade reliability",
    body: "Every request is logged with latency, status and voice used for full observability.",
  },
]

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard")
    }
  }, [loading, user, router])

  return (
    <main className="flex min-h-dvh w-full items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl lg:grid-cols-2">
        {/* Left: brand + highlights */}
        <GlassPanel className="hidden flex-col justify-between rounded-none p-10 lg:flex">
          <div className="flex flex-col gap-10">
            <BrandMark />
            <div className="flex flex-col gap-3">
              <h1 className="text-balance font-serif text-4xl font-semibold leading-tight text-foreground">
                Text to voice, for every <span className="text-gradient">language</span> your users speak.
              </h1>
              <p className="text-pretty font-sans leading-relaxed text-muted-foreground">
                Little Voice API is a private control room for your speech infrastructure — manage upstream keys,
                curate voices, and monitor every request from one serene console.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {highlights.map((h) => (
              <div key={h.title} className="group flex items-start gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-primary/25 to-accent/10 text-primary transition-transform duration-200 group-hover:scale-110">
                  <h.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="font-serif text-sm font-semibold text-foreground">{h.title}</p>
                  <p className="font-sans text-sm leading-relaxed text-muted-foreground">{h.body}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Right: login */}
        <GlassPanel className="flex flex-col gap-8 rounded-none border-l-0 p-8 sm:p-10 lg:border-l lg:border-white/10">
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <BrandMark />
          </div>

          <div className="flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
            <h2 className="font-serif text-2xl font-semibold text-foreground">Admin sign in</h2>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">
              Sign in with your admin credentials to reach the dashboard, manage voices, and generate speech.
            </p>
          </div>

          <LoginForm />

          <p className="text-center font-sans text-xs leading-relaxed text-muted-foreground">
            Access is restricted to authorized administrators of Little Voice API.
          </p>
        </GlassPanel>
      </div>
    </main>
  )
}
