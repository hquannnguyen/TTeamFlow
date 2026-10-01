import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { NotificationType, ProjectRole, ProjectStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

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

    const comments = await this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
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

    return comments.map((c) => ({
      ...c,
      author: c.user,
    }));
  }

  async create(taskId: string, actorId: string, dto: CreateCommentDto) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        project: true,
        assignments: { select: { userId: true } },
      },
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

    const created = await this.prisma.comment.create({
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

    if (this.notifications) {
      const projectMembers = await this.prisma.projectMember.findMany({
        where: { projectId: task.projectId },
        include: { user: { select: { id: true, fullName: true } } },
      });

      const mentionedUserIds = new Set<string>();
      const payloads = [];

      // 1. Quét @mentions
      for (const m of projectMembers) {
        if (
          m.userId !== actorId &&
          dto.content.includes(`@${m.user.fullName}`)
        ) {
          mentionedUserIds.add(m.userId);
          const snippet =
            dto.content.length > 80
              ? `${dto.content.slice(0, 80)}...`
              : dto.content;
          payloads.push({
            userId: m.userId,
            actorId,
            projectId: task.projectId,
            taskId: task.id,
            type: NotificationType.TASK_MENTIONED,
            title: "Nhắc đến bạn trong bình luận",
            content: `${created.user.fullName} đã nhắc đến bạn: "${snippet}"`,
            data: {
              projectId: task.projectId,
              taskId: task.id,
              commentId: created.id,
            },
          });
        }
      }

      // 2. Thông báo cho người tạo task & các assignees khác
      const taskInvolvedUserIds = new Set<string>([
        task.creatorId,
        ...task.assignments.map((a) => a.userId),
      ]);

      for (const uId of taskInvolvedUserIds) {
        if (uId !== actorId && !mentionedUserIds.has(uId)) {
          payloads.push({
            userId: uId,
            actorId,
            projectId: task.projectId,
            taskId: task.id,
            type: NotificationType.TASK_COMMENTED,
            title: "Bình luận mới trong nhiệm vụ",
            content: `${created.user.fullName} đã bình luận vào nhiệm vụ "${task.title}".`,
            data: {
              projectId: task.projectId,
              taskId: task.id,
              commentId: created.id,
            },
          });
        }
      }

      if (payloads.length > 0) {
        await this.notifications.createMany(payloads);
      }
    }

    return {
      ...created,
      author: created.user,
    };
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

    const updated = await this.prisma.comment.update({
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

    return {
      ...updated,
      author: updated.user,
    };
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
