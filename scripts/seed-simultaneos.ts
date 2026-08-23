/**
 * 1) Alinha o horário dos barbeiros do estab001 (org001) ao horário do estabelecimento (até 23h).
 * 2) Gera agendamentos simultâneos nesta semana: no mesmo horário, 1 corte por barbeiro.
 * 3) Cria um barbeiro e um cliente na Unidade 2 (estab. diferente), para testar troca de unidade.
 * Executar: npx tsx --env-file=.env scripts/seed-simultaneos.ts
 */
import { PrismaClient, AppointmentStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import { gerarUsername } from "../src/lib/auth"

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const ESTAB1 = "estab001"
const ESTAB2 = "cmq58a32d002wiweac2rp582v" // Barbearia Costa, Unidade 2

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const seg = new Date(d)
  seg.setDate(diff)
  seg.setHours(0, 0, 0, 0)
  return seg
}

async function alinharHorarios() {
  const estab = await prisma.establishment.findUnique({ where: { id: ESTAB1 } })
  if (!estab?.businessHours) throw new Error("estab001 sem businessHours")
  const horarios = estab.businessHours as Array<{ dayOfWeek: number; startTime: string; endTime: string; isOpen: boolean }>

  const barbeiros = await prisma.user.findMany({
    where: { establishmentId: ESTAB1, isActive: true, role: { in: ["BARBER_CLT", "BARBER_MEI", "AUTONOMO"] } },
  })

  for (const barbeiro of barbeiros) {
    for (const h of horarios) {
      await prisma.userSchedule.upsert({
        where: { userId_dayOfWeek: { userId: barbeiro.id, dayOfWeek: h.dayOfWeek } },
        create: {
          userId: barbeiro.id,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
          isActive: h.isOpen,
        },
        update: {
          endTime: h.endTime,
          isActive: h.isOpen,
        },
      })
    }
  }
  console.log(`✅ Horário de ${barbeiros.length} barbeiros alinhado ao estabelecimento (até 23h, seg-sáb).`)
  return barbeiros
}

async function gerarAgendamentosSimultaneos(barbeiros: { id: string; name: string }[]) {
  const servicos = await prisma.service.findMany({ where: { establishmentId: ESTAB1, isActive: true } })
  const clientes = await prisma.client.findMany({ where: { establishmentId: ESTAB1, isActive: true } })
  if (!servicos.length) throw new Error("Nenhum serviço encontrado em estab001")
  if (clientes.length < barbeiros.length) throw new Error("Poucos clientes ativos para cobrir todos os barbeiros por horário")

  const seg = startOfWeek(new Date())
  const agora = new Date()

  // Horários simultâneos: seg→sáb, 09:00–22:00, de hora em hora (todos os barbeiros ocupados ao mesmo tempo)
  const slots: Date[] = []
  for (let dia = 0; dia < 6; dia++) {
    for (let h = 9; h <= 22; h++) {
      const dt = new Date(seg)
      dt.setDate(seg.getDate() + dia)
      dt.setHours(h, 0, 0, 0)
      slots.push(dt)
    }
  }

  let criados = 0
  for (const slot of slots) {
    // embaralha clientes por slot para não repetir sempre o mesmo par cliente/barbeiro
    const clientesSlot = [...clientes].sort(() => Math.random() - 0.5)

    for (let i = 0; i < barbeiros.length; i++) {
      const barbeiro = barbeiros[i]
      const cliente = clientesSlot[i % clientesSlot.length]
      const servico = servicos[Math.floor(Math.random() * servicos.length)]

      const passado = slot < agora
      const status: AppointmentStatus = passado
        ? (Math.random() > 0.1 ? "DONE" : "NO_SHOW")
        : (Math.random() > 0.4 ? "SCHEDULED" : "CONFIRMED")

      await prisma.appointment.create({
        data: {
          scheduledAt: slot,
          status,
          clientId: cliente.id,
          professionalId: barbeiro.id,
          serviceId: servico.id,
          establishmentId: ESTAB1,
          ...(status === "DONE" ? {
            startedAt: slot,
            finishedAt: new Date(slot.getTime() + (servico.durationMin ?? 30) * 60000),
            payment: {
              create: {
                method: (["PIX", "CASH", "CARD"] as const)[Math.floor(Math.random() * 3)],
                status: "PAID",
                amount: servico.price,
                pixStatus: "PAID",
              },
            },
          } : {}),
        },
      })
      criados++
    }
  }
  console.log(`✅ ${criados} agendamentos simultâneos criados (${slots.length} horários x ${barbeiros.length} barbeiros) para a semana de ${seg.toLocaleDateString("pt-BR")}.`)
}

async function criarBarbeiroEClienteEstab2() {
  const estab2 = await prisma.establishment.findUnique({ where: { id: ESTAB2 } })
  if (!estab2) throw new Error("Estabelecimento 2 não encontrado")

  const nomeBarbeiro = "Fernando Souza"
  const username = await gerarUsername(nomeBarbeiro)
  const passwordHash = await bcrypt.hash("123456", 10)

  const barbeiro = await prisma.user.create({
    data: {
      name: nomeBarbeiro,
      email: `fernando.souza.${estab2.id.slice(-6)}@barberos.test`,
      role: "BARBER_CLT",
      employmentType: "CLT",
      establishmentId: estab2.id,
      organizationId: estab2.organizationId,
      isActive: true,
      username,
      passwordHash,
      isFirstLogin: true,
      admissionDate: new Date(),
    },
  })

  const cliente = await prisma.client.create({
    data: {
      name: "Marcos Vinícius",
      phone: "35999887766",
      establishmentId: estab2.id,
      isActive: true,
    },
  })

  console.log(`✅ Barbeiro criado na "${estab2.name}": ${barbeiro.name} (username: ${username})`)
  console.log(`✅ Cliente criado na "${estab2.name}": ${cliente.name}`)
}

async function main() {
  const barbeiros = await alinharHorarios()
  await gerarAgendamentosSimultaneos(barbeiros)
  await criarBarbeiroEClienteEstab2()
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => { prisma.$disconnect(); pool.end() })
