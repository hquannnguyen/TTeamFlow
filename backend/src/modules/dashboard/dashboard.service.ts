import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(projectId: string) {
    const [totalTasks, completedTasks, overdueTasks, columns, workloads] =
      await Promise.all([
        this.prisma.task.count({
          where: { projectId, deletedAt: null },
        }),
        this.prisma.task.count({
          where: { projectId, deletedAt: null, completedAt: { not: null } },
        }),
        this.prisma.task.count({
          where: {
            projectId,
            deletedAt: null,
            completedAt: null,
            dueDate: { lt: new Date() },
          },
        }),
        this.prisma.kanbanColumn.findMany({
          where: { projectId },
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            isCompleted: true,
            _count: {
              select: {
                tasks: { where: { deletedAt: null } },
              },
            },
          },
        }),
        this.prisma.projectMember.findMany({
          where: { projectId },
          select: {
            user: {
              select: {
                id: true,
                fullName: true,
                _count: {
                  select: {
                    taskAssignments: {
                      where: {
                        task: {
                          projectId,
                          deletedAt: null,
                          completedAt: null,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      progress:
        totalTasks === 0
          ? 0
          : Number(((completedTasks / totalTasks) * 100).toFixed(2)),
      statusDistribution: columns.map((column) => ({
        columnId: column.id,
        columnName: column.name,
        isCompleted: column.isCompleted,
        count: column._count.tasks,
      })),
      memberWorkload: workloads.map(({ user }) => ({
        userId: user.id,
        name: user.fullName,
        activeTaskCount: user._count.taskAssignments,
      })),
    };
  }
}
