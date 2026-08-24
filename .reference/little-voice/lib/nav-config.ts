import { BookOpenText, KeyRound, LayoutDashboard, Mic2, Settings, Sparkles } from "lucide-react"

export const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/voices", label: "Voices", icon: Mic2 },
  { href: "/generator", label: "Generate", icon: Sparkles },
  { href: "/docs", label: "Api", icon: BookOpenText },
]

export const menuNav = [
  { href: "/generator", label: "Voice Generator", icon: Sparkles, description: "Test and generate speech instantly" },
  { href: "/apikeys", label: "Api Keys", icon: KeyRound, description: "Manage Speechify upstream keys" },
  { href: "/docs", label: "Api Documentation", icon: BookOpenText, description: "Integration guides in 5 languages" },
  { href: "/voices", label: "Voices", icon: Mic2, description: "Add and curate available voices" },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Configure text limits for Little Voice and Speechify",
  },
]
