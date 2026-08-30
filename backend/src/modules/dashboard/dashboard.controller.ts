import { Controller, Get, Param } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("projects/:projectId/dashboard")
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
