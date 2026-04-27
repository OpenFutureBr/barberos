import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@barberos.com" },
    update: {},
    create: {
      id: "admin001",
      name: "Admin BarberOS",
      email: "admin@barberos.com",
      role: "ADMIN",
      employmentType: "CLT",
      isActive: true,
    },
  })

  console.log("✅ Usuário criado:", admin.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())