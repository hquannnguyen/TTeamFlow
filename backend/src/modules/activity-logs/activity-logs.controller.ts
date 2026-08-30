import { Controller, Get, Param } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { ActivityLogsService } from "./activity-logs.service";

@Controller("projects/:projectId/activity-logs")
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Get()
  list(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }
}
