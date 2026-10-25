import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DashboardMetricsResponse } from "./interfaces/dashboard-metrics.interface";

/** Số nhiệm vụ chưa xong từ mức này trở lên được coi là quá tải. */
export const WORKLOAD_OVERLOAD_THRESHOLD = 8;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(projectId: string): Promise<DashboardMetricsResponse> {
    const [
      totalTasks,
      completedTasks,
      overdueTasks,
      columns,
      workloads,
      assignments,
    ] = await Promise.all([
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
          type: true,
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
              avatarUrl: true,
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
      this.prisma.taskAssignment.findMany({
        where: { task: { projectId, deletedAt: null } },
        select: {
          userId: true,
          task: {
            select: {
              completedAt: true,
              column: { select: { type: true, isCompleted: true } },
            },
          },
        },
      }),
    ]);

    // Gom số liệu theo từng thành viên: tổng / hoàn thành / đang làm / chưa bắt đầu
    const breakdown = new Map<
      string,
      { total: number; completed: number; inProgress: number; todo: number }
    >();
    for (const { userId, task } of assignments) {
      const row = breakdown.get(userId) ?? {
        total: 0,
        completed: 0,
        inProgress: 0,
        todo: 0,
      };
      row.total += 1;
      if (task.completedAt) row.completed += 1;
      else if (task.column.type === "TODO") row.todo += 1;
      else row.inProgress += 1;
      breakdown.set(userId, row);
    }

    // "Đang làm": nhiệm vụ nằm ở cột đang xử lý — không phải cột TODO (chưa bắt đầu)
    // và không phải cột hoàn thành.
    const activeTasks = columns
      .filter((column) => !column.isCompleted && column.type !== "TODO")
      .reduce((sum, column) => sum + column._count.tasks, 0);

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      activeTasks,
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
      memberWorkload: workloads
        .map(({ user }) => {
          const stats = breakdown.get(user.id);
          const activeTaskCount = user._count.taskAssignments;
          return {
            userId: user.id,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            activeTaskCount,
            totalTaskCount: stats?.total ?? 0,
            completedCount: stats?.completed ?? 0,
            inProgressCount: stats?.inProgress ?? 0,
            todoCount: stats?.todo ?? 0,
            isOverloaded: activeTaskCount >= WORKLOAD_OVERLOAD_THRESHOLD,
          };
        })
        .sort((a, b) => b.activeTaskCount - a.activeTaskCount),
    };
  }
}
