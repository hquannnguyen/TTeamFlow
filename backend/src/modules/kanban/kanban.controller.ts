import { Controller, Get, Param } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { KanbanService } from "./kanban.service";

@Controller("projects/:projectId/kanban")
export class KanbanController {
  constructor(private readonly service: KanbanService) {}

  @ProjectRoles(
    ProjectRole.OWNER,
    ProjectRole.MANAGER,
    ProjectRole.MEMBER,
    ProjectRole.VIEWER,
  )
  @Get()
  board(@Param("projectId") projectId: string) {
    return this.service.board(projectId);
  }
}
