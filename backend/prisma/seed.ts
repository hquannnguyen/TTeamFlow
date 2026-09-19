import { PrismaClient, SystemRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("Admin@123", 10);
  const memberHash = await bcrypt.hash("Member@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      fullName: "System Admin",
      passwordHash: adminHash,
      systemRole: SystemRole.ADMIN,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: {
      email: "member@example.com",
      fullName: "Demo Member",
      passwordHash: memberHash,
    },
  });

  // Gán admin và member vào các dự án hiện có để có thể phân công nhiệm vụ
  const projects = await prisma.project.findMany({ where: { deletedAt: null } });
  for (const project of projects) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project.id, userId: admin.id },
      },
      update: {},
      create: {
        projectId: project.id,
        userId: admin.id,
        role: "MANAGER",
      },
    });

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project.id, userId: member.id },
      },
      update: {},
      create: {
        projectId: project.id,
        userId: member.id,
        role: "MEMBER",
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
