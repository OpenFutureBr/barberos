import type { Prisma } from "@prisma/client"

/**
 * Campos de User que podem ir para qualquer usuário logado da unidade
 * (agenda, bancada, modais de agendamento e venda).
 */
export const CAMPOS_PUBLICOS = {
  id: true,
  name: true,
  role: true,
  employmentType: true,
  phone: true,
  isActive: true,
  attendsHome: true,
  breakBetweenAppts: true,
  admissionDate: true,
  bookingSlug: true,
  image: true,
  createdAt: true,
} satisfies Prisma.UserSelect

/**
 * Dados pessoais e de remuneração: só para quem tem o recurso "equipe".
 * passwordHash não entra em nenhum dos dois conjuntos.
 */
export const CAMPOS_GESTAO = {
  email: true,
  username: true,
  isFirstLogin: true,
  birthDate: true,
  pixKey: true,
  commissionPct: true,
  benchFee: true,
  benchFeePct: true,
  homeZipCode: true,
  homeAddress: true,
  homeNumber: true,
  homeNeighborhood: true,
  homeCity: true,
  serviceZoneKm: true,
  serviceZoneAreas: true,
} satisfies Prisma.UserSelect
