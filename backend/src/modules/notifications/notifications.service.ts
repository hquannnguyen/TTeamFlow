import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryNotificationsDto } from "./dto/query-notifications.dto";
import { CreateNotificationPayload } from "./interfaces/create-notification.interface";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userId: string, query: QueryNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [total, unreadCount, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              projectKey: true,
              name: true,
            },
          },
          task: {
            select: {
              id: true,
              taskNumber: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        unreadCount,
      },
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException("Thông báo không tồn tại");
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        "Bạn không có quyền thao tác trên thông báo này",
      );
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  async remove(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException("Thông báo không tồn tại");
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException("Bạn không có quyền xóa thông báo này");
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  async create(payload: CreateNotificationPayload) {
    // Không gửi thông báo cho chính mình đối với bình luận hoặc nhắc tên (mentions)
    if (
      payload.actorId &&
      payload.actorId === payload.userId &&
      (payload.type === NotificationType.TASK_COMMENTED ||
        payload.type === NotificationType.TASK_MENTIONED)
    ) {
      return null;
    }

    return this.prisma.notification.create({
      data: {
        userId: payload.userId,
        actorId: payload.actorId ?? null,
        projectId: payload.projectId ?? null,
        taskId: payload.taskId ?? null,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        data: (payload.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }

  async createMany(payloads: CreateNotificationPayload[]) {
    // Lọc bỏ self-notification cho comments hoặc mentions
    const validPayloads = payloads.filter(
      (p) =>
        !p.actorId ||
        p.actorId !== p.userId ||
        (p.type !== NotificationType.TASK_COMMENTED &&
          p.type !== NotificationType.TASK_MENTIONED),
    );

    if (validPayloads.length === 0) {
      return { count: 0 };
    }

    return this.prisma.notification.createMany({
      data: validPayloads.map((p) => ({
        userId: p.userId,
        actorId: p.actorId ?? null,
        projectId: p.projectId ?? null,
        taskId: p.taskId ?? null,
        type: p.type,
        title: p.title,
        content: p.content,
        data: (p.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      })),
    });
  }
}
