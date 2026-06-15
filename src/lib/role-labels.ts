export const ROLE_LABEL: Record<string, string> = {
  ADMIN:        "Super Admin",
  ORG_OWNER:    "Administrador",
  ORG_MANAGER:  "Gerente",
  UNIT_MANAGER: "Gerente de Unidade",
  RECEPTIONIST: "Recepcionista",
  MANAGER:      "Gerente",
  BARBER_CLT:   "Profissional",
  BARBER_MEI:   "Profissional",
  AUTONOMO:     "Profissional",
  PROFESSIONAL: "Profissional",
  CLIENT:       "Cliente",
}

export const ROLE_COLOR: Record<string, string> = {
  ADMIN:        "bg-red-500/10 text-red-400 border-red-500/20",
  ORG_OWNER:    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ORG_MANAGER:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  UNIT_MANAGER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  RECEPTIONIST: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  MANAGER:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  BARBER_CLT:   "bg-zinc-700/50 text-zinc-300 border-zinc-600/30",
  BARBER_MEI:   "bg-purple-500/10 text-purple-400 border-purple-500/20",
  AUTONOMO:     "bg-zinc-700/50 text-zinc-300 border-zinc-600/30",
  PROFESSIONAL: "bg-zinc-700/50 text-zinc-300 border-zinc-600/30",
  CLIENT:       "bg-zinc-800/50 text-zinc-500 border-zinc-700/20",
}

export function roleLabel(role: string) {
  return ROLE_LABEL[role] ?? role
}

export function roleBadge(role: string) {
  return ROLE_COLOR[role] ?? "bg-zinc-700/50 text-zinc-400 border-zinc-600/20"
}
