import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { MoveTaskDto } from "./dto/move-task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, creatorId: string, dto: CreateTaskDto) {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: dto.columnId, projectId },
    });
    if (!column) throw new BadRequestException("Column không thuộc project");

    if (dto.assigneeIds?.length) {
      const memberCount = await this.prisma.projectMember.count({
        where: {
          projectId,
          userId: { in: dto.assigneeIds },
        },
      });
      if (memberCount !== dto.assigneeIds.length) {
        throw new BadRequestException(
          "Một hoặc nhiều assignee không thuộc project",
        );
      }
    }

    const max = await this.prisma.task.aggregate({
      where: { columnId: dto.columnId, deletedAt: null },
      _max: { position: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId,
          columnId: dto.columnId,
          creatorId,
          title: dto.title.trim(),
          description: dto.description?.trim(),
          priority: dto.priority,
          position: (max._max.position ?? 0) + 1000,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          completedAt: column.isCompleted ? new Date() : null,
          assignments: dto.assigneeIds?.length
            ? {
                create: dto.assigneeIds.map((userId) => ({ userId })),
              }
            : undefined,
        },
        include: {
          assignments: {
            include: {
              user: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId,
          actorId: creatorId,
          action: "TASK_CREATED",
          entityType: "TASK",
          entityId: task.id,
        },
      });

      return task;
    });
  }

  async move(taskId: string, actorId: string, dto: MoveTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { column: true },
    });
    if (!task) throw new NotFoundException("Task không tồn tại");

    const target = await this.prisma.kanbanColumn.findFirst({
      where: {
        id: dto.targetColumnId,
        projectId: task.projectId,
      },
    });
    if (!target) throw new BadRequestException("Column đích không hợp lệ");

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          columnId: target.id,
          position: dto.newPosition,
          completedAt: target.isCompleted
            ? (task.completedAt ?? new Date())
            : null,
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          actorId,
          action: target.isCompleted ? "TASK_COMPLETED" : "TASK_MOVED",
          entityType: "TASK",
          entityId: task.id,
          metadata: {
            fromColumnId: task.columnId,
            toColumnId: target.id,
            newPosition: dto.newPosition,
          },
        },
      });

      return updated;
    });
  }

  async getProjectId(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { projectId: true },
    });
    if (!task) throw new NotFoundException("Task không tồn tại");
    return task.projectId;
  }
}
