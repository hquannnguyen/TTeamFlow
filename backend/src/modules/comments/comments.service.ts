import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectRole, ProjectStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(taskId: string, actorId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException("Task không tồn tại");
    }

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

    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
    });
  }

  async create(taskId: string, actorId: string, dto: CreateCommentDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: { project: true },
    });
    if (!task) {
      throw new NotFoundException("Task không tồn tại");
    }

    if (task.project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException("Dự án đã lưu trữ, không thể bình luận");
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId: actorId,
        },
      },
    });
    if (!member || member.role === ProjectRole.VIEWER) {
      throw new ForbiddenException(
        "Bạn không có quyền bình luận trong task này",
      );
    }

    return this.prisma.comment.create({
      data: {
        taskId,
        userId: actorId,
        content: dto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
    });
  }

  async update(commentId: string, actorId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: { project: true },
        },
      },
    });
    if (!comment || comment.task.deletedAt !== null) {
      throw new NotFoundException("Bình luận không tồn tại");
    }

    if (comment.task.project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException(
        "Dự án đã lưu trữ, không thể chỉnh sửa bình luận",
      );
    }

    // Quy tắc: Chỉ owner của comment mới có quyền sửa
    if (comment.userId !== actorId) {
      throw new ForbiddenException(
        "Chỉ người tạo bình luận mới có quyền chỉnh sửa",
      );
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(commentId: string, actorId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: { project: true },
        },
      },
    });
    if (!comment || comment.task.deletedAt !== null) {
      throw new NotFoundException("Bình luận không tồn tại");
    }

    if (comment.task.project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException(
        "Dự án đã lưu trữ, không thể xóa bình luận",
      );
    }

    // Quy tắc: Chỉ owner của comment mới có quyền xóa
    if (comment.userId !== actorId) {
      throw new ForbiddenException("Chỉ người tạo bình luận mới có quyền xóa");
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return { success: true };
  }
}
