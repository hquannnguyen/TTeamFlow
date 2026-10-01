import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  NotificationType,
  ProjectRole,
  ProjectStatus,
  SystemRole,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { MoveTaskDto } from "./dto/move-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

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

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
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
          entityId: created.id,
        },
      });

      return created;
    });

    if (this.notifications && dto.assigneeIds?.length) {
      await this.notifications.createMany(
        dto.assigneeIds.map((userId) => ({
          userId,
          actorId: creatorId,
          projectId,
          taskId: task.id,
          type: NotificationType.TASK_ASSIGNED,
          title: "Phân công nhiệm vụ",
          content: `Bạn đã được phân công vào nhiệm vụ "${task.title}".`,
          data: { projectId, taskId: task.id },
        })),
      );
    }

    return task;
  }

  async move(
    taskId: string,
    actorId: string,
    dto: MoveTaskDto,
    systemRole: SystemRole = SystemRole.USER,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { column: true, project: true },
    });
    if (!task) throw new NotFoundException("Task không tồn tại");

    if (task.project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException("Dự án đã lưu trữ, không thể chỉnh sửa");
    }

    if (systemRole !== SystemRole.ADMIN) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: task.projectId, userId: actorId },
        },
      });

      if (!member || member.role === ProjectRole.VIEWER) {
        throw new ForbiddenException("Bạn không có quyền di chuyển task");
      }
    }

    const target = await this.prisma.kanbanColumn.findFirst({
      where: {
        id: dto.targetColumnId,
        projectId: task.projectId,
      },
    });
    if (!target) throw new BadRequestException("Column đích không hợp lệ");

    const nextCompletedAt = target.isCompleted
      ? task.column.isCompleted
        ? (task.completedAt ?? new Date())
        : new Date()
      : null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          columnId: target.id,
          position: dto.newPosition,
          completedAt: nextCompletedAt,
        },
        include: {
          column: true,
          assignments: {
            include: {
              user: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
          },
        },
      });

      // Kiểm tra và reorder lại các task trong column nếu có trùng lặp hoặc khoảng cách quá nhỏ
      const columnTasks = await tx.task.findMany({
        where: { columnId: target.id, deletedAt: null },
        orderBy: [{ position: "asc" }, { updatedAt: "desc" }],
        select: { id: true, position: true },
      });

      let needsReorder = false;
      for (let i = 0; i < columnTasks.length - 1; i++) {
        if (columnTasks[i + 1].position - columnTasks[i].position < 1) {
          needsReorder = true;
          break;
        }
      }

      if (needsReorder) {
        for (let i = 0; i < columnTasks.length; i++) {
          const normalizedPos = (i + 1) * 1000;
          if (columnTasks[i].position !== normalizedPos) {
            await tx.task.update({
              where: { id: columnTasks[i].id },
              data: { position: normalizedPos },
            });
            if (columnTasks[i].id === taskId) {
              updated.position = normalizedPos;
            }
          }
        }
      }

      const isNowCompleted = target.isCompleted && !task.column.isCompleted;
      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          actorId,
          action: isNowCompleted ? "TASK_COMPLETED" : "TASK_MOVED",
          entityType: "TASK",
          entityId: task.id,
          metadata: {
            fromColumnId: task.columnId,
            fromColumnName: task.column.name,
            toColumnId: target.id,
            toColumnName: target.name,
            newPosition: updated.position,
          },
        },
      });

      let notifPayloads: Array<{
        userId: string;
        actorId: string;
        projectId: string;
        taskId: string;
        type: NotificationType;
        title: string;
        content: string;
        data: Record<string, unknown>;
      }> = [];

      if (this.notifications && updated.assignments?.length) {
        const title = isNowCompleted
          ? "Nhiệm vụ đã hoàn thành"
          : "Trạng thái nhiệm vụ thay đổi";
        const content = isNowCompleted
          ? `Nhiệm vụ "${task.title}" đã được hoàn thành (chuyển sang "${target.name}").`
          : `Nhiệm vụ "${task.title}" đã được chuyển sang "${target.name}".`;

        notifPayloads = updated.assignments.map((a) => ({
            userId: a.userId,
            actorId,
            projectId: task.projectId,
            taskId: task.id,
            type: NotificationType.TASK_STATUS_CHANGED,
            title,
            content,
            data: {
              projectId: task.projectId,
              taskId: task.id,
              targetColumnId: target.id,
              targetColumnName: target.name,
              isCompleted: target.isCompleted,
            },
          }));
      }

      return { updated, notifPayloads };
    });

    if (this.notifications && notifPayloads.length > 0) {
      await this.notifications.createMany(notifPayloads);
    }

    return updated;
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
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
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

    let addedIds: string[] = [];
    let removedIds: string[] = [];
    let oldAssigneeMap = new Map<string, string>();
    let oldDue: string | null = null;
    let newDue: string | null = null;

    return this.prisma.$transaction(async (tx) => {
      let hasLogged = false;

      // Xử lý thay đổi người được phân công (Assignees) & ghi log Chuyển giao / Phân công / Gỡ
      if (dto.assigneeIds !== undefined) {
        const oldAssignments = task.assignments || [];
        oldAssigneeMap = new Map(
          oldAssignments.map((a) => [a.user.id, a.user.fullName]),
        );
        const oldAssigneeIds = Array.from(oldAssigneeMap.keys());
        const newAssigneeIds = Array.from(new Set(dto.assigneeIds));

        addedIds = newAssigneeIds.filter((id) => !oldAssigneeMap.has(id));
        removedIds = oldAssigneeIds.filter(
          (id) => !newAssigneeIds.includes(id),
        );

        if (addedIds.length > 0 || removedIds.length > 0) {
          await tx.taskAssignment.deleteMany({ where: { taskId } });
          if (newAssigneeIds.length) {
            await tx.taskAssignment.createMany({
              data: newAssigneeIds.map((userId) => ({ taskId, userId })),
            });
          }

          const addedUsers =
            addedIds.length > 0
              ? await tx.user.findMany({
                  where: { id: { in: addedIds } },
                  select: { id: true, fullName: true },
                })
              : [];
          const addedUserMap = new Map(
            addedUsers.map((u) => [u.id, u.fullName]),
          );

          // Phát hiện Chuyển giao trực tiếp (1 người cũ -> 1 người mới)
          if (removedIds.length === 1 && addedIds.length === 1) {
            const fromId = removedIds[0];
            const toId = addedIds[0];
            const fromName = oldAssigneeMap.get(fromId) ?? "thành viên";
            const toName = addedUserMap.get(toId) ?? "thành viên";

            await tx.activityLog.create({
              data: {
                projectId: task.projectId,
                actorId,
                action: "TASK_ASSIGNED",
                entityType: "TASK",
                entityId: task.id,
                metadata: {
                  isTransfer: true,
                  transferredFromUserId: fromId,
                  transferredFromUserName: fromName,
                  assignedUserId: toId,
                  assignedUserName: toName,
                },
              },
            });
            hasLogged = true;
          } else {
            // Ghi nhận gỡ thành viên
            for (const rId of removedIds) {
              await tx.activityLog.create({
                data: {
                  projectId: task.projectId,
                  actorId,
                  action: "TASK_UNASSIGNED",
                  entityType: "TASK",
                  entityId: task.id,
                  metadata: {
                    unassignedUserId: rId,
                    unassignedUserName: oldAssigneeMap.get(rId) ?? "thành viên",
                  },
                },
              });
              hasLogged = true;
            }

            // Ghi nhận gán thành viên mới
            for (const aId of addedIds) {
              await tx.activityLog.create({
                data: {
                  projectId: task.projectId,
                  actorId,
                  action: "TASK_ASSIGNED",
                  entityType: "TASK",
                  entityId: task.id,
                  metadata: {
                    assignedUserId: aId,
                    assignedUserName: addedUserMap.get(aId) ?? "thành viên",
                  },
                },
              });
              hasLogged = true;
            }
          }
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

      // Ghi log khi thay đổi mức độ ưu tiên
      if (dto.priority !== undefined && dto.priority !== task.priority) {
        await tx.activityLog.create({
          data: {
            projectId: task.projectId,
            actorId,
            action: "TASK_UPDATED",
            entityType: "TASK",
            entityId: task.id,
            metadata: {
              changeType: "PRIORITY",
              field: "priority",
              oldPriority: task.priority,
              newPriority: dto.priority,
            },
          },
        });
        hasLogged = true;
      }

      // Ghi log khi thay đổi thời hạn deadline
      if (dto.dueDate !== undefined) {
        oldDue = task.dueDate ? task.dueDate.toISOString() : null;
        newDue = dto.dueDate ? new Date(dto.dueDate).toISOString() : null;
        if (oldDue !== newDue) {
          await tx.activityLog.create({
            data: {
              projectId: task.projectId,
              actorId,
              action: "TASK_UPDATED",
              entityType: "TASK",
              entityId: task.id,
              metadata: {
                changeType: "DUE_DATE",
                field: "dueDate",
                oldDueDate: oldDue,
                newDueDate: newDue,
              },
            },
          });
          hasLogged = true;
        }
      }

      // Ghi log khi đổi tiêu đề
      if (dto.title !== undefined && dto.title.trim() !== task.title) {
        await tx.activityLog.create({
          data: {
            projectId: task.projectId,
            actorId,
            action: "TASK_UPDATED",
            entityType: "TASK",
            entityId: task.id,
            metadata: {
              changeType: "TITLE",
              field: "title",
              oldTitle: task.title,
              newTitle: dto.title.trim(),
            },
          },
        });
        hasLogged = true;
      }

      // Ghi log khi đổi mô tả
      if (
        dto.description !== undefined &&
        (dto.description?.trim() ?? null) !== (task.description ?? null)
      ) {
        await tx.activityLog.create({
          data: {
            projectId: task.projectId,
            actorId,
            action: "TASK_UPDATED",
            entityType: "TASK",
            entityId: task.id,
            metadata: {
              changeType: "DESCRIPTION",
              field: "description",
            },
          },
        });
        hasLogged = true;
      }

      if (!hasLogged) {
        await tx.activityLog.create({
          data: {
            projectId: task.projectId,
            actorId,
            action: "TASK_UPDATED",
            entityType: "TASK",
            entityId: task.id,
          },
        });
      }

      let notifPayloads: Array<{
        userId: string;
        actorId: string;
        projectId: string;
        taskId: string;
        type: NotificationType;
        title: string;
        content: string;
        data: Record<string, unknown>;
      }> = [];

      if (this.notifications) {
        // 1. Chuyển giao trực tiếp
        if (removedIds.length === 1 && addedIds.length === 1) {
          const fromId = removedIds[0];
          const toId = addedIds[0];
          const fromName = oldAssigneeMap.get(fromId) ?? "thành viên";
          notifPayloads.push({
            userId: toId,
            actorId,
            projectId: task.projectId,
            taskId: task.id,
            type: NotificationType.TASK_ASSIGNED,
            title: "Chuyển giao nhiệm vụ",
            content: `Bạn vừa được chuyển giao nhiệm vụ "${updatedTask.title}" từ ${fromName}.`,
            data: { projectId: task.projectId, taskId: task.id },
          });
        } else if (addedIds.length > 0) {
          // 2. Thành viên mới được gán
          for (const aId of addedIds) {
            notifPayloads.push({
              userId: aId,
              actorId,
              projectId: task.projectId,
              taskId: task.id,
              type: NotificationType.TASK_ASSIGNED,
              title: "Phân công nhiệm vụ",
              content: `Bạn đã được phân công vào nhiệm vụ "${updatedTask.title}".`,
              data: { projectId: task.projectId, taskId: task.id },
            });
          }
        }

        // 3. Thay đổi hạn hoàn thành (deadline)
        if (dto.dueDate !== undefined && oldDue !== newDue) {
          const currentAssignees = updatedTask.assignments || [];
          for (const a of currentAssignees) {
            if (!addedIds.includes(a.userId)) {
              notifPayloads.push({
                userId: a.userId,
                actorId,
                projectId: task.projectId,
                taskId: task.id,
                type: NotificationType.TASK_DUE_DATE_CHANGED,
                title: "Cập nhật thời hạn nhiệm vụ",
                content: `Thời hạn hoàn thành của nhiệm vụ "${updatedTask.title}" đã được thay đổi.`,
                data: { projectId: task.projectId, taskId: task.id },
              });
            }
          }
        }
      }

      return { updatedTask, notifPayloads };
    });

    if (this.notifications && notifPayloads.length > 0) {
      await this.notifications.createMany(notifPayloads);
    }

    return updatedTask;
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
      include: {
        user: { select: { id: true, fullName: true } },
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

    const assignment = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.taskAssignment.create({
        data: { taskId, userId: targetUserId },
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          actorId,
          action: "TASK_ASSIGNED",
          entityType: "TASK",
          entityId: task.id,
          metadata: {
            assignedUserId: targetUserId,
            ...(targetMember?.user?.fullName
              ? { assignedUserName: targetMember.user.fullName }
              : {}),
          },
        },
      });

      return assignment;
    });

    if (this.notifications) {
      await this.notifications.create({
        userId: targetUserId,
        actorId,
        projectId: task.projectId,
        taskId: task.id,
        type: NotificationType.TASK_ASSIGNED,
        title: "Phân công nhiệm vụ",
        content: `Bạn đã được phân công vào nhiệm vụ "${task.title}".`,
        data: { projectId: task.projectId, taskId: task.id },
      });
    }

    return assignment;
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
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException("Thành viên chưa được gán vào task này");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.taskAssignment.delete({
        where: { taskId_userId: { taskId, userId: targetUserId } },
      });

      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          actorId,
          action: "TASK_UNASSIGNED",
          entityType: "TASK",
          entityId: task.id,
          metadata: {
            unassignedUserId: targetUserId,
            ...(existing?.user?.fullName
              ? { unassignedUserName: existing.user.fullName }
              : {}),
          },
        },
      });

      return { success: true };
    });
  }
}
