"use client"

import useSWR from "swr"
import { getSettings, listApiKeys, listRequestLogs, listVoices } from "@/lib/firestore"

export function useApiKeys() {
  return useSWR("apiKeys", listApiKeys, { refreshInterval: 15000 })
}

export function useVoices() {
  return useSWR("voices", listVoices, { refreshInterval: 30000 })
}

export function useRequestLogs(max = 100) {
  return useSWR(["requestLogs", max], () => listRequestLogs(max), { refreshInterval: 10000 })
}

export function useSettings() {
  return useSWR("settings", getSettings, { refreshInterval: 30000 })
}
