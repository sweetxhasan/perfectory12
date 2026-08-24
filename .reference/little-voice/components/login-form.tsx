"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Mail } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password, remember)
      router.replace("/dashboard")
    } catch {
      toast.error("Invalid email or password", {
        description: "Check your admin credentials and try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="font-sans text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Email address
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/15 text-foreground">
            <Mail className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <Input
            id="email"
            type="email"
            required
            autoComplete="username"
            placeholder="admin@littlevoice.api"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border-white/10 bg-white/5 pl-12 font-sans backdrop-blur-sm transition-shadow duration-200 placeholder:text-muted-foreground/60 focus-visible:ring-primary/40 focus-visible:glow-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="font-sans text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Password
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/15 text-foreground">
            <Lock className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border-white/10 bg-white/5 pl-12 font-sans backdrop-blur-sm transition-shadow duration-200 placeholder:text-muted-foreground/60 focus-visible:ring-primary/40 focus-visible:glow-ring"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="group flex items-center gap-3 text-sm text-foreground/80">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(Boolean(v))}
            className="size-5 rounded-md border-white/15 bg-white/5 transition-all duration-200 data-checked:border-transparent data-checked:bg-gradient-to-br data-checked:from-primary data-checked:to-accent data-checked:shadow-[0_0_14px_oklch(0.64_0.2_290_/_55%)] [&_svg]:size-3.5 [&_svg]:transition-transform [&_svg]:duration-200 [&_svg]:scale-90 data-checked:[&_svg]:scale-100"
          />
          Remember me
        </label>
        <span className="text-xs text-muted-foreground">Admin access only</span>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 gap-2 rounded-xl bg-gradient-to-r from-primary to-accent font-sans text-base tracking-wide text-primary-foreground shadow-[0_14px_34px_-10px_oklch(0.64_0.2_290_/_65%)] transition-transform duration-200 hover:scale-[1.01] hover:shadow-[0_18px_44px_-10px_oklch(0.64_0.2_290_/_75%)]"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Signing in" : "Sign in to dashboard"}
      </Button>
    </form>
  )
}
