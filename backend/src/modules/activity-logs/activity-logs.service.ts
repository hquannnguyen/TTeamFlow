import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string) {
    return this.prisma.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });
  }
}
