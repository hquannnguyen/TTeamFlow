import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AddProjectMemberDto } from "./dto/add-project-member.dto";

@Injectable()
export class ProjectMembersService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
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
    });
  }

  async add(projectId: string, actorId: string, dto: AddProjectMemberDto) {
    if (dto.role === ProjectRole.OWNER) {
      throw new BadRequestException("Không thể thêm OWNER bằng endpoint này");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user) throw new NotFoundException("Không tìm thấy người dùng");

    const exists = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });
    if (exists) throw new ConflictException("Thành viên đã ở trong dự án");

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.create({
        data: { projectId, userId: user.id, role: dto.role },
      });

      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: "MEMBER_ADDED",
          entityType: "PROJECT_MEMBER",
          entityId: member.id,
          metadata: { addedUserId: user.id, role: dto.role },
        },
      });

      return member;
    });
  }
}
