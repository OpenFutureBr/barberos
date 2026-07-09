/**
 * Insere agendamentos para todos os barbeiros da org 01 / estab 01 nesta semana.
 * Executar: npx tsx --env-file=.env scripts/seed-agendamentos.ts
 */
import { PrismaClient, AppointmentStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
})

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const seg = new Date(d)
  seg.setDate(diff)
  seg.setHours(0, 0, 0, 0)
  return seg
}

async function main() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } })
  if (!org) throw new Error("Nenhuma organização encontrada")

  const estab = await prisma.establishment.findFirst({
    where: { organizationId: org.id, isActive: true },
    orderBy: { createdAt: "asc" },
  })
  if (!estab) throw new Error("Nenhum estabelecimento encontrado")

  const barbeiros = await prisma.user.findMany({
    where: {
      establishmentId: estab.id,
      isActive: true,
      role: { in: ["BARBER_CLT", "BARBER_MEI", "AUTONOMO"] },
    },
  })
  if (!barbeiros.length) throw new Error("Nenhum barbeiro encontrado")

  const servicos = await prisma.service.findMany({
    where: { establishmentId: estab.id, isActive: true },
  })
  if (!servicos.length) throw new Error("Nenhum serviço encontrado")

  const clientes = await prisma.client.findMany({
    where: { establishmentId: estab.id, isActive: true },
    take: 50,
  })
  if (!clientes.length) throw new Error("Nenhum cliente encontrado")

  console.log(`Org: ${org.name}`)
  console.log(`Estab: ${estab.name}`)
  console.log(`Barbeiros (${barbeiros.length}): ${barbeiros.map(b => b.name).join(", ")}`)
  console.log(`Serviços: ${servicos.length} | Clientes: ${clientes.length}`)

  // Slots: seg→sáb desta semana, 09:00–17:45, a cada 45min
  const seg = startOfWeek(new Date())
  const slots: Date[] = []
  for (let dia = 0; dia < 6; dia++) {
    for (let h = 9; h <= 17; h++) {
      for (const min of [0, 45]) {
        if (h === 17 && min === 45) continue
        const dt = new Date(seg)
        dt.setDate(seg.getDate() + dia)
        dt.setHours(h, min, 0, 0)
        slots.push(dt)
      }
    }
  }

  const agora = new Date()
  let criados = 0
  let clienteIdx = 0

  for (const barbeiro of barbeiros) {
    // Distribui slots entre barbeiros de forma intercalada
    const meusSlots = slots.filter((_, i) => i % barbeiros.length === barbeiros.indexOf(barbeiro)).slice(0, 18)

    for (const slot of meusSlots) {
      const cliente = clientes[clienteIdx % clientes.length]
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
          establishmentId: estab.id,
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
      clienteIdx++
    }
  }

  console.log(`\n✅ ${criados} agendamentos criados para a semana de ${seg.toLocaleDateString("pt-BR")}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => { prisma.$disconnect(); pool.end() })
