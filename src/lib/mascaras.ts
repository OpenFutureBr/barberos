// Máscaras de campo únicas (telefone, WhatsApp, CNPJ, CEP).
//
// Antes havia 11 cópias. Bugs que as divergências causavam:
//  - sem `if (!d) return ""` o campo devolvia "(" e nunca podia ser esvaziado;
//  - fixo de 10 dígitos saía como "(11) 12345-678" em vez de "(11) 1234-5678".
//
// A tela de clientes tem máscara própria, com DDI e quantidade de dígitos por
// país — não é a mesma coisa que estas, que são só para números do Brasil.

const soDigitos = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max)

/** (11) 1234-5678 para fixo, (11) 91234-5678 para celular. */
export function mascaraTelefone(v: string): string {
  const d = soDigitos(v, 11)
  if (!d) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** +55 (11) 91234-5678 */
export function mascaraWhatsapp(v: string): string {
  const d = soDigitos(v, 13)
  if (!d) return ""
  if (d.length <= 2) return `+${d}`
  if (d.length <= 4) return `+${d.slice(0, 2)} (${d.slice(2)}`
  if (d.length <= 9) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`
  if (d.length <= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
}

/** 12.345.678/0001-90 */
export function mascaraCnpj(v: string): string {
  const d = soDigitos(v, 14)
  if (!d) return ""
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** 12345-678 */
export function mascaraCep(v: string): string {
  const d = soDigitos(v, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}
