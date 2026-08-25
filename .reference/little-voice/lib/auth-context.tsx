"use client"

import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { firebaseAuth } from "@/lib/firebase"

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password, rememberMe) {
        await setPersistence(firebaseAuth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
        await signInWithEmailAndPassword(firebaseAuth, email, password)
      },
      async logout() {
        await signOut(firebaseAuth)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
