import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { MoveTaskDto } from "./dto/move-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, creatorId: string, dto: CreateTaskDto) {
    if (
      dto.startDate &&
      dto.dueDate &&
      new Date(dto.dueDate) < new Date(dto.startDate)
    ) {
      throw new BadRequestException(
        "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
      );
    }

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

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: actorId },
      },
    });

    if (!member || member.role === ProjectRole.VIEWER) {
      throw new ForbiddenException("Bạn không có quyền di chuyển task");
    }

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

  async getDetail(taskId: string, actorId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        column: true,
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        checklistItems: { orderBy: { position: "asc" } },
      },
    });

    if (!task) throw new NotFoundException("Task không tồn tại");

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: actorId },
      },
    });
    if (!member) {
      throw new ForbiddenException("Bạn không có quyền trong dự án này");
    }

    return task;
  }

  async update(taskId: string, actorId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) throw new NotFoundException("Task không tồn tại");

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: actorId },
      },
    });
    if (!member || member.role === ProjectRole.VIEWER) {
      throw new ForbiddenException("Bạn không có quyền cập nhật task này");
    }

    const effectiveStartDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : task.startDate;
    const effectiveDueDate =
      dto.dueDate !== undefined
        ? dto.dueDate
          ? new Date(dto.dueDate)
          : null
        : task.dueDate;

    if (
      effectiveStartDate &&
      effectiveDueDate &&
      effectiveDueDate < effectiveStartDate
    ) {
      throw new BadRequestException(
        "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
      );
    }

    if (dto.assigneeIds !== undefined && dto.assigneeIds.length) {
      const memberCount = await this.prisma.projectMember.count({
        where: {
          projectId: task.projectId,
          userId: { in: dto.assigneeIds },
        },
      });
      if (memberCount !== dto.assigneeIds.length) {
        throw new BadRequestException(
          "Một hoặc nhiều assignee không thuộc project",
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.assigneeIds !== undefined) {
        await tx.taskAssignment.deleteMany({ where: { taskId } });
        if (dto.assigneeIds.length) {
          await tx.taskAssignment.createMany({
            data: dto.assigneeIds.map((userId) => ({ taskId, userId })),
          });
        }
      }

      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          title: dto.title?.trim(),
          description: dto.description?.trim(),
          priority: dto.priority,
          startDate:
            dto.startDate !== undefined
              ? dto.startDate
                ? new Date(dto.startDate)
                : null
              : undefined,
          dueDate:
            dto.dueDate !== undefined
              ? dto.dueDate
                ? new Date(dto.dueDate)
                : null
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
          projectId: task.projectId,
          actorId,
          action: "TASK_UPDATED",
          entityType: "TASK",
          entityId: task.id,
        },
      });

      return updatedTask;
    });
  }

  async remove(taskId: string, actorId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) throw new NotFoundException("Task không tồn tại");

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: actorId },
      },
    });
    if (
      !member ||
      (member.role !== ProjectRole.OWNER && member.role !== ProjectRole.MANAGER)
    ) {
      throw new ForbiddenException("Bạn không có quyền xóa task này");
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedTask = await tx.task.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });

      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          actorId,
          action: "TASK_DELETED",
          entityType: "TASK",
          entityId: task.id,
        },
      });

      return deletedTask;
    });
  }

  async assign(taskId: string, actorId: string, targetUserId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) throw new NotFoundException("Task không tồn tại");

    const actorMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: actorId },
      },
    });
    if (!actorMember || actorMember.role === ProjectRole.VIEWER) {
      throw new ForbiddenException(
        "Bạn không có quyền gán thành viên vào task",
      );
    }

    const targetMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: targetUserId },
      },
    });
    if (!targetMember) {
      throw new BadRequestException("Người được gán không thuộc dự án");
    }

    const existing = await this.prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId: targetUserId } },
    });
    if (existing) {
      throw new BadRequestException("Thành viên đã được gán vào task này");
    }

    return this.prisma.taskAssignment.create({
      data: { taskId, userId: targetUserId },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
  }

  async unassign(taskId: string, actorId: string, targetUserId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) throw new NotFoundException("Task không tồn tại");

    const actorMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: actorId },
      },
    });
    if (!actorMember || actorMember.role === ProjectRole.VIEWER) {
      throw new ForbiddenException(
        "Bạn không có quyền gỡ thành viên khỏi task",
      );
    }

    const existing = await this.prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId: targetUserId } },
    });
    if (!existing) {
      throw new NotFoundException("Thành viên chưa được gán vào task này");
    }

    await this.prisma.taskAssignment.delete({
      where: { taskId_userId: { taskId, userId: targetUserId } },
    });

    return { success: true };
  }
}
