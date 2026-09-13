import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  KanbanColumnType,
  ProjectRole,
  ProjectStatus,
  SystemRole,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityAction } from "../activity-logs/constants/activity-action.constant";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(
    userId: string,
    systemRole: SystemRole = SystemRole.USER,
    status?: ProjectStatus,
    scope?: "all" | "my",
    ownerId?: string,
  ) {
    const isAdmin = systemRole === SystemRole.ADMIN;
    const memberFilter =
      !isAdmin || scope === "my"
        ? { members: { some: { userId } } }
        : {};

    const projects = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        ...memberFilter,
        ...(status ? { status } : {}),
        ...(ownerId ? { createdById: ownerId } : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
          select: {
            role: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
        tasks: {
          where: {
            deletedAt: null,
            OR: [
              { completedAt: { not: null } },
              { column: { isCompleted: true } },
              { column: { type: KanbanColumnType.DONE } },
            ],
          },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return projects.map((p) => {
      const totalTasks = p._count?.tasks ?? 0;
      const completedTasks = p.tasks?.length ?? 0;
      const progress =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const { tasks, ...rest } = p;
      return {
        ...rest,
        taskStats: {
          total: totalTasks,
          completed: completedTasks,
          progress,
        },
      };
    });
  }

  async findOne(
    projectId: string,
    userId: string,
    systemRole: SystemRole = SystemRole.USER,
  ) {
    const isAdmin = systemRole === SystemRole.ADMIN;
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        ...(isAdmin ? {} : { members: { some: { userId } } }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
          select: {
            role: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: {
          select: {
            tasks: { where: { deletedAt: null } },
          },
        },
        tasks: {
          where: {
            deletedAt: null,
            OR: [
              { completedAt: { not: null } },
              { column: { isCompleted: true } },
              { column: { type: KanbanColumnType.DONE } },
            ],
          },
          select: { id: true },
        },
      },
    });

    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const totalTasks = project._count?.tasks ?? 0;
    const completedTasks = project.tasks?.length ?? 0;
    const progress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const { tasks, ...rest } = project;

    return {
      ...rest,
      taskStats: {
        total: totalTasks,
        completed: completedTasks,
        progress,
      },
    };
  }

  async create(userId: string, dto: CreateProjectDto) {
    if (
      dto.startDate &&
      dto.dueDate &&
      new Date(dto.dueDate) < new Date(dto.startDate)
    ) {
      throw new BadRequestException(
        "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: dto.name.trim(),
          projectKey: dto.projectKey.trim(),
          description: dto.description?.trim(),
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          createdById: userId,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          role: ProjectRole.OWNER,
        },
      });

      await tx.kanbanColumn.createMany({
        data: [
          {
            projectId: project.id,
            name: "TODO",
            position: 1000,
            type: KanbanColumnType.TODO,
            isCompleted: false,
          },
          {
            projectId: project.id,
            name: "DOING",
            position: 2000,
            type: KanbanColumnType.DOING,
            isCompleted: false,
          },
          {
            projectId: project.id,
            name: "DONE",
            position: 3000,
            type: KanbanColumnType.DONE,
            isCompleted: true,
          },
        ],
      });

      await tx.activityLog.create({
        data: {
          projectId: project.id,
          actorId: userId,
          action: ActivityAction.PROJECT_CREATED,
          entityType: "PROJECT",
          entityId: project.id,
        },
      });

      return project;
    });
  }

  async update(
    projectId: string,
    actorId: string,
    dto: UpdateProjectDto,
    actorRole: SystemRole = SystemRole.USER,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const isAdmin = actorRole === SystemRole.ADMIN;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorId } },
    });
    if (
      !isAdmin &&
      (!member ||
        (member.role !== ProjectRole.OWNER && member.role !== ProjectRole.MANAGER))
    ) {
      throw new ForbiddenException("Bạn không có quyền cập nhật dự án");
    }

    const startDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : project.startDate;

    const dueDate =
      dto.dueDate !== undefined
        ? dto.dueDate
          ? new Date(dto.dueDate)
          : null
        : project.dueDate;

    if (startDate && dueDate && dueDate < startDate) {
      throw new BadRequestException(
        "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          description:
            dto.description !== undefined ? dto.description?.trim() : undefined,
          startDate,
          dueDate,
        },
        include: {
          members: {
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: ActivityAction.PROJECT_UPDATED,
          entityType: "PROJECT",
          entityId: projectId,
          metadata: {
            updatedFields: Object.keys(dto),
          },
        },
      });

      return updated;
    });
  }

  async archive(
    projectId: string,
    actorId: string,
    actorRole: SystemRole = SystemRole.USER,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const isAdmin = actorRole === SystemRole.ADMIN;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorId } },
    });
    if (
      !isAdmin &&
      (!member ||
        (member.role !== ProjectRole.OWNER && member.role !== ProjectRole.MANAGER))
    ) {
      throw new ForbiddenException("Bạn không có quyền lưu trữ dự án");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.ARCHIVED },
      });

      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: ActivityAction.PROJECT_ARCHIVED,
          entityType: "PROJECT",
          entityId: projectId,
        },
      });

      return updated;
    });
  }

  async restore(
    projectId: string,
    actorId: string,
    actorRole: SystemRole = SystemRole.USER,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const isAdmin = actorRole === SystemRole.ADMIN;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorId } },
    });
    if (
      !isAdmin &&
      (!member ||
        (member.role !== ProjectRole.OWNER && member.role !== ProjectRole.MANAGER))
    ) {
      throw new ForbiddenException("Bạn không có quyền khôi phục dự án");
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.ACTIVE },
      });

      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: ActivityAction.PROJECT_RESTORED,
          entityType: "PROJECT",
          entityId: projectId,
        },
      });

      return updated;
    });
  }

  async remove(
    projectId: string,
    actorId: string,
    actorRole: SystemRole = SystemRole.USER,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const isAdmin = actorRole === SystemRole.ADMIN;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorId } },
    });
    if (!isAdmin && (!member || member.role !== ProjectRole.OWNER)) {
      throw new ForbiddenException("Chỉ OWNER hoặc ADMIN mới có quyền xóa dự án");
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() },
      });

      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: ActivityAction.PROJECT_DELETED,
          entityType: "PROJECT",
          entityId: projectId,
        },
      });

      return deleted;
    });
  }
}
