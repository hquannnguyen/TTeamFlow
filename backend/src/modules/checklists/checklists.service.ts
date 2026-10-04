import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectRole, ProjectStatus, SystemRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateChecklistItemDto } from "./dto/create-checklist-item.dto";
import { UpdateChecklistItemDto } from "./dto/update-checklist-item.dto";

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(taskId: string, actorId: string, actorRole?: SystemRole) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException("Task không tồn tại");
    }

    if (actorRole !== SystemRole.ADMIN) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: task.projectId,
            userId: actorId,
          },
        },
      });
      if (!member) {
        throw new ForbiddenException("Bạn không có quyền trong dự án này");
      }
    }

    return this.prisma.checklistItem.findMany({
      where: { taskId },
      orderBy: { position: "asc" },
    });
  }

  async create(
    taskId: string,
    actorId: string,
    data: CreateChecklistItemDto,
    actorRole?: SystemRole,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { project: true },
    });
    if (!task) {
      throw new NotFoundException("Task không tồn tại");
    }

    if (task.project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException(
        "Dự án đã lưu trữ, không thể thêm nhiệm vụ phụ",
      );
    }

    if (actorRole !== SystemRole.ADMIN) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: task.projectId,
            userId: actorId,
          },
        },
      });
      if (!member || member.role === ProjectRole.VIEWER) {
        throw new ForbiddenException("Bạn không có quyền thêm checklist");
      }
    }

    const max = await this.prisma.checklistItem.aggregate({
      where: { taskId },
      _max: { position: true },
    });
    const newPosition = (max._max.position ?? 0) + 1000;

    return this.prisma.checklistItem.create({
      data: {
        taskId,
        content: data.content,
        position: newPosition,
      },
    });
  }

  async update(
    id: string,
    actorId: string,
    data: UpdateChecklistItemDto,
    actorRole?: SystemRole,
  ) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id },
      include: { task: { include: { project: true } } },
    });
    if (!item || item.task.deletedAt !== null) {
      throw new NotFoundException("Checklist item không tồn tại");
    }

    if (item.task.project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException(
        "Dự án đã lưu trữ, không thể cập nhật nhiệm vụ phụ",
      );
    }

    if (actorRole !== SystemRole.ADMIN) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: item.task.projectId,
            userId: actorId,
          },
        },
      });
      if (!member || member.role === ProjectRole.VIEWER) {
        throw new ForbiddenException("Bạn không có quyền cập nhật checklist");
      }
    }

    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        content: data.content,
        isCompleted: data.isCompleted,
      },
    });
  }

  async remove(id: string, actorId: string, actorRole?: SystemRole) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id },
      include: { task: { include: { project: true } } },
    });
    if (!item || item.task.deletedAt !== null) {
      throw new NotFoundException("Checklist item không tồn tại");
    }

    if (item.task.project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException(
        "Dự án đã lưu trữ, không thể xóa nhiệm vụ phụ",
      );
    }

    if (actorRole !== SystemRole.ADMIN) {
      const member = await this.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: item.task.projectId,
            userId: actorId,
          },
        },
      });
      if (!member || member.role === ProjectRole.VIEWER) {
        throw new ForbiddenException("Bạn không có quyền xóa checklist");
      }
    }

    return this.prisma.checklistItem.delete({
      where: { id },
    });
  }
}
