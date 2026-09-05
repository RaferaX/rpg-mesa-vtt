"use client"

import { useEffect } from "react"

export function CursorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("cursorStyle")
    if (saved && saved !== "default") {
      document.body.classList.add(`cursor-${saved}`)
    }
  }, [])

  return <>{children}</>
}