import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Junta classes condicionais (clsx) e resolve conflitos de utilitarios
// Tailwind mantendo a ultima (twMerge) — sem isso, passar className="px-6" para
// um componente que ja tem "px-4" deixaria as duas no elemento e o resultado
// dependeria da ordem no CSS gerado, nao da intencao de quem chamou.
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes))
}
