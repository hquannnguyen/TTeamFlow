import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectRole } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { PROJECT_ROLES_KEY } from "../decorators/project-roles.decorator";
import type { AuthUser } from "../interfaces/auth-user.interface";

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<ProjectRole[]>(
      PROJECT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user: AuthUser; params: Record<string, string> }
      >();

    if (!request.user) {
      throw new UnauthorizedException("Vui lòng đăng nhập");
    }

    const projectId = request.params.projectId ?? request.params.id;

    if (!projectId) {
      throw new ForbiddenException(
        "Không xác định được project để kiểm tra quyền",
      );
    }

    // SystemRole ADMIN có toàn quyền quản trị trên mọi dự án (chỉ chặn nếu dự án đã bị xóa mềm)
    if (request.user.systemRole === "ADMIN") {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { deletedAt: true },
      });
      if (!project || project.deletedAt) {
        throw new ForbiddenException("Bạn không có quyền trong dự án này");
      }
      return true;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: request.user.id,
        },
      },
      include: {
        project: {
          select: { deletedAt: true },
        },
      },
    });

    if (
      !membership ||
      membership.project?.deletedAt ||
      !requiredRoles.includes(membership.role)
    ) {
      throw new ForbiddenException("Bạn không có quyền trong dự án này");
    }

    return true;
  }
}
