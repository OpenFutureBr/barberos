/** Cria barbeiro e cliente na Unidade 2, para testar troca de unidade. */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import { gerarUsername } from "../src/lib/auth"

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const ESTAB2 = "cmq58a32d002wiweac2rp582v"

async function main() {
  const estab2 = await prisma.establishment.findUnique({ where: { id: ESTAB2 } })
  if (!estab2) throw new Error("Estabelecimento 2 não encontrado")

  const jaExiste = await prisma.user.findFirst({ where: { establishmentId: estab2.id } })
  if (jaExiste) {
    console.log(`Já existe barbeiro em "${estab2.name}": ${jaExiste.name} — pulando criação.`)
  } else {
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
    console.log(`✅ Barbeiro criado na "${estab2.name}": ${barbeiro.name} (username: ${username})`)
  }

  const clienteExiste = await prisma.client.findFirst({ where: { establishmentId: estab2.id, name: "Marcos Vinícius" } })
  if (clienteExiste) {
    console.log(`Cliente "Marcos Vinícius" já existe em "${estab2.name}" — pulando criação.`)
  } else {
    const cliente = await prisma.client.create({
      data: {
        name: "Marcos Vinícius",
        phone: "35999887766",
        establishmentId: estab2.id,
        isActive: true,
      },
    })
    console.log(`✅ Cliente criado na "${estab2.name}": ${cliente.name}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => { prisma.$disconnect(); pool.end() })
