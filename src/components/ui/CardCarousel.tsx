"use client"

import { useRef, useState } from "react"

// Carrossel de cards mobile no mesmo padrão do Dashboard: swipe horizontal
// com snap, card ativo em destaque (escala/opacidade) e dots de posição.
// No desktop (md+) o carrossel não é renderizado — a página deve mostrar os
// mesmos cards num grid ao lado (hidden md:grid).
export default function CardCarousel({ cards }: { cards: React.ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function handleScroll() {
    const el = ref.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 0) return
    setActive(Math.max(0, Math.min(cards.length - 1, Math.round((el.scrollLeft / maxScroll) * (cards.length - 1)))))
  }

  if (cards.length === 0) return null

  return (
    <div className="md:hidden">
      <div
        ref={ref}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4"
        style={{ paddingInline: "13vw", scrollPaddingInline: "13vw", gap: "10px" }}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            className={`flex-shrink-0 snap-center transition-all duration-200 ${active === i ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}
            style={{ width: "74vw" }}
          >
            {card}
          </div>
        ))}
      </div>
      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {cards.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-200 ${active === i ? "w-5 h-1.5 bg-amber-500" : "w-1.5 h-1.5 bg-zinc-700"}`} />
          ))}
        </div>
      )}
    </div>
  )
}
