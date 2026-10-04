import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ProjectRoleGuard } from "../../common/guards/project-role.guard";
import { DashboardService } from "./dashboard.service";

@Controller("projects/:projectId/dashboard")
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @ProjectRoles(
    ProjectRole.OWNER,
    ProjectRole.MANAGER,
    ProjectRole.MEMBER,
    ProjectRole.VIEWER,
  )
  @Get()
  metrics(@Param("projectId") projectId: string) {
    return this.service.metrics(projectId);
  }
}
