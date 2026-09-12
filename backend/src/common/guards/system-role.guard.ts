import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { SYSTEM_ROLES_KEY } from "../decorators/system-roles.decorator";
import type { AuthUser } from "../interfaces/auth-user.interface";

@Injectable()
export class SystemRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthUser }>();

    if (!request.user) {
      throw new UnauthorizedException("Vui lòng đăng nhập");
    }

    if (!requiredRoles.includes(request.user.systemRole)) {
      throw new ForbiddenException("Bạn không có quyền hệ thống phù hợp");
    }

    return true;
  }
}
