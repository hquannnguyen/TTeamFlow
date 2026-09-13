import { Body, Controller, Param, Patch, UseGuards } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ProjectRoleGuard } from "../../common/guards/project-role.guard";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { ReorderColumnsDto } from "./dto/reorder-columns.dto";
import { KanbanService } from "./kanban.service";

@Controller("projects/:projectId/columns")
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class ColumnsController {
  constructor(private readonly kanbanService: KanbanService) {}

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Patch("reorder")
  reorder(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.kanbanService.reorderColumns(projectId, user.id, dto);
  }
}
