import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityAction } from "./constants/activity-action.constant";
import { ActivityEntityType } from "./constants/activity-entity.constant";
import { ActivityLogQueryDto } from "./dto/activity-log-query.dto";

export interface CreateActivityLogParams<T = Prisma.InputJsonValue> {
  projectId: string;
  actorId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  metadata?: T;
}

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách nhật ký hoạt động có phân trang và bộ lọc theo action/entityType
   */
  async list(projectId: string, query?: ActivityLogQueryDto) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.max(1, Math.min(100, query?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {
      projectId,
      ...(query?.action ? { action: query.action } : {}),
      ...(query?.entityType ? { entityType: query.entityType } : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          actor: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Helper ghi nhật ký hoạt động (Append-only).
   * Có thể thực thi độc lập hoặc nằm trong một Prisma Transaction có sẵn.
   */
  async log<T = Prisma.InputJsonValue>(
    params: CreateActivityLogParams<T>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.activityLog.create({
      data: {
        projectId: params.projectId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
    });
  }
}
