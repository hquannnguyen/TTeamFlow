import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { KanbanColumnType, ProjectRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.project.findMany({
      where: {
        deletedAt: null,
        members: { some: { userId } },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        members: { some: { userId } },
      },
      include: {
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
        },
      },
    });

    if (!project) throw new NotFoundException("Không tìm thấy dự án");
    return project;
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
          action: "PROJECT_CREATED",
          entityType: "PROJECT",
          entityId: project.id,
        },
      });

      return project;
    });
  }
}
