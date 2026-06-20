"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export default function NavigationProgress() {
  const pathname = usePathname()
  const [width, setWidth] = useState(0)
  const [fading, setFading] = useState(false)
  const prevRef = useRef(pathname)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  function clearAll() { timers.current.forEach(clearTimeout); timers.current = [] }
  function schedule(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms)
    timers.current.push(t)
  }

  useEffect(() => {
    if (pathname === prevRef.current) return
    prevRef.current = pathname

    clearAll()
    setFading(false)
    setWidth(0)
    schedule(() => setWidth(20), 16)
    schedule(() => setWidth(55), 120)
    schedule(() => setWidth(80), 350)
    schedule(() => setWidth(100), 650)
    schedule(() => setFading(true), 800)
    schedule(() => { setWidth(0); setFading(false) }, 1050)

    return clearAll
  }, [pathname])

  const visible = width > 0

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ opacity: visible ? (fading ? 0 : 1) : 0, transition: fading ? "opacity 250ms ease-out" : "none" }}>
      <div
        className="h-full bg-amber-500 rounded-r-full"
        style={{ width: `${width}%`, transition: width === 0 ? "none" : "width 300ms ease-out" }} />
    </div>
  )
}
