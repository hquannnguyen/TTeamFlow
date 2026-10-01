import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { NotificationType, ProjectRole, ProjectStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AddProjectMemberDto } from "./dto/add-project-member.dto";
import { UpdateProjectMemberRoleDto } from "./dto/update-project-member-role.dto";

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async list(projectId: string) {
    const members = await this.prisma.projectMember.findMany({
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

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      fullName: m.user.fullName,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }));
  }

  async add(projectId: string, actorId: string, dto: AddProjectMemberDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, status: true, deletedAt: true },
    });
    if (!project || project.deletedAt) {
      throw new NotFoundException("Không tìm thấy dự án");
    }
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException(
        "Không thể thêm thành viên vào dự án đã lưu trữ",
      );
    }

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

    const result = await this.prisma.$transaction(async (tx) => {
      const member = await tx.projectMember.create({
        data: { projectId, userId: user.id, role: dto.role },
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

      return {
        id: member.id,
        userId: member.userId,
        fullName: member.user.fullName,
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user,
      };
    });

    if (this.notifications && user.id !== actorId) {
      await this.notifications.create({
        userId: user.id,
        actorId,
        projectId,
        type: NotificationType.PROJECT_INVITED,
        title: "Lời mời tham gia dự án",
        content: `Bạn đã được thêm vào dự án "${project.name}" với vai trò ${dto.role}.`,
        data: { projectId },
      });
    }

    return result;
  }

  async updateRole(
    projectId: string,
    actorId: string,
    targetUserId: string,
    dto: UpdateProjectMemberRoleDto,
  ) {
    if (dto.role === ProjectRole.OWNER) {
      throw new BadRequestException(
        "Không thể chuyển vai trò sang OWNER bằng endpoint này",
      );
    }

    const targetMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
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
    });

    if (!targetMember) {
      throw new NotFoundException("Không tìm thấy thành viên trong dự án");
    }

    // MANAGER không được quản lý OWNER
    const actorMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorId } },
    });
    if (
      actorMember?.role === ProjectRole.MANAGER &&
      targetMember.role === ProjectRole.OWNER
    ) {
      throw new ForbiddenException(
        "Quản lý không được phép thao tác trên Chủ sở hữu",
      );
    }

    if (targetMember.role === ProjectRole.OWNER) {
      throw new BadRequestException(
        "Không thể thay đổi vai trò của Chủ sở hữu (OWNER)",
      );
    }

    const oldRole = targetMember.role;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.projectMember.update({
        where: { projectId_userId: { projectId, userId: targetUserId } },
        data: { role: dto.role },
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
      });

      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: "MEMBER_ROLE_CHANGED",
          entityType: "PROJECT_MEMBER",
          entityId: updated.id,
          metadata: {
            targetUserId,
            oldRole,
            newRole: dto.role,
          },
        },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        fullName: updated.user.fullName,
        email: updated.user.email,
        avatarUrl: updated.user.avatarUrl,
        role: updated.role,
        joinedAt: updated.joinedAt,
        user: updated.user,
      };
    });
  }

  async remove(projectId: string, actorId: string, targetUserId: string) {
    const targetMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } },
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
    });

    if (!targetMember) {
      throw new NotFoundException("Không tìm thấy thành viên trong dự án");
    }

    // MANAGER không được quản lý OWNER
    const actorMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: actorId } },
    });
    if (
      actorMember?.role === ProjectRole.MANAGER &&
      targetMember.role === ProjectRole.OWNER
    ) {
      throw new ForbiddenException(
        "Quản lý không được phép thao tác trên Chủ sở hữu",
      );
    }

    if (targetMember.role === ProjectRole.OWNER) {
      throw new BadRequestException(
        "Không thể xóa chủ sở hữu (OWNER) khỏi dự án",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Gỡ gán tasks: Xóa các taskAssignment của member trong project này
      const unassignedResult = await tx.taskAssignment.deleteMany({
        where: {
          userId: targetUserId,
          task: {
            projectId,
          },
        },
      });

      // 2. Xóa record ProjectMember
      await tx.projectMember.delete({
        where: {
          projectId_userId: { projectId, userId: targetUserId },
        },
      });

      // 3. Ghi Activity Log
      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: "MEMBER_REMOVED",
          entityType: "PROJECT_MEMBER",
          entityId: targetMember.id,
          metadata: {
            removedUserId: targetUserId,
            removedUserEmail: targetMember.user.email,
            unassignedTaskCount: unassignedResult.count,
          },
        },
      });

      return {
        success: true,
        removedUserId: targetUserId,
        unassignedTaskCount: unassignedResult.count,
      };
    });
  }
}
