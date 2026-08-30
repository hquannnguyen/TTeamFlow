import { PrismaClient, SystemRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("Admin@123", 10);
  const memberHash = await bcrypt.hash("Member@123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      fullName: "System Admin",
      passwordHash: adminHash,
      systemRole: SystemRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: {
      email: "member@example.com",
      fullName: "Demo Member",
      passwordHash: memberHash,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
