import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ProjectRoleGuard } from "../../common/guards/project-role.guard";
import { ActivityLogsService } from "./activity-logs.service";
import { ActivityLogQueryDto } from "./dto/activity-log-query.dto";

@Controller("projects/:projectId/activity-logs")
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @ProjectRoles(
    ProjectRole.OWNER,
    ProjectRole.MANAGER,
    ProjectRole.MEMBER,
    ProjectRole.VIEWER,
  )
  @Get()
  list(
    @Param("projectId") projectId: string,
    @Query() query: ActivityLogQueryDto,
  ) {
    return this.service.list(projectId, query);
  }
}
