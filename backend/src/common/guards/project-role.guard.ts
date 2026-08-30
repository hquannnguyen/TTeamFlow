import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
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

    const projectId = request.params.projectId ?? request.params.id;

    if (!projectId) {
      throw new ForbiddenException(
        "Không xác định được project để kiểm tra quyền",
      );
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: request.user.id,
        },
      },
    });

    if (!membership || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException("Bạn không có quyền trong dự án này");
    }

    return true;
  }
}
