import { cn } from "@/lib/cn"

// text-base no mobile e text-sm a partir de md: o Safari do iOS da zoom
// automatico em qualquer input com fonte menor que 16px, e o usuario fica com
// a tela deslocada depois de digitar. Ver fase C do redesign.
const BASE_CAMPO =
  "w-full bg-surface-2 border border-line rounded-xl px-3 min-h-11 text-base md:text-sm text-fg " +
  "outline-none transition-colors focus:border-accent placeholder:text-fg-4 " +
  "disabled:opacity-50 disabled:cursor-not-allowed"

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(BASE_CAMPO, className)} {...props} />
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(BASE_CAMPO, "appearance-none pr-8", className)} {...props} />
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(BASE_CAMPO, "py-2.5 min-h-20 resize-y", className)} {...props} />
}

// Envolve rotulo + campo + dica/erro. Passe `htmlFor` com o id do campo para
// que o rotulo fique de fato associado a ele (clicar no texto foca o campo e o
// leitor de tela anuncia junto); sem isso sai um texto solto.
export function Field({
  label, hint, erro, htmlFor, className, children,
}: {
  label?: React.ReactNode
  hint?: React.ReactNode
  erro?: React.ReactNode
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        htmlFor
          ? <label htmlFor={htmlFor} className="text-fg-2 text-xs block">{label}</label>
          : <span className="text-fg-2 text-xs block">{label}</span>
      )}
      {children}
      {erro ? (
        <p className="text-red-400 text-xs">{erro}</p>
      ) : hint ? (
        <p className="text-fg-4 text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
