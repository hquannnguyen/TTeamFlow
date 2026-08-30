import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class KanbanService {
  constructor(private readonly prisma: PrismaService) {}

  board(projectId: string) {
    return this.prisma.kanbanColumn.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        tasks: {
          where: { deletedAt: null },
          orderBy: { position: "asc" },
          include: {
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            _count: {
              select: { checklistItems: true, comments: true },
            },
          },
        },
      },
    });
  }
}
