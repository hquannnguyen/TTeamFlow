import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityLogQueryDto } from "./dto/activity-log-query.dto";

export interface CreateActivityLogParams {
  projectId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string, query?: ActivityLogQueryDto) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.max(1, Math.min(100, query?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.activityLog.count({
        where: { projectId },
      }),
      this.prisma.activityLog.findMany({
        where: { projectId },
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
   * Helper method to record append-only activity log.
   * Can run either inside an existing Prisma transaction or standalone.
   */
  async log(params: CreateActivityLogParams, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.activityLog.create({
      data: {
        projectId: params.projectId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
      },
    });
  }
}
