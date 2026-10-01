import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ProjectRoleGuard } from "../../common/guards/project-role.guard";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreateColumnDto } from "./dto/create-column.dto";
import { ReorderColumnsDto } from "./dto/reorder-columns.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";
import { KanbanService } from "./kanban.service";

@Controller("projects/:projectId/columns")
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class ColumnsController {
  constructor(private readonly kanbanService: KanbanService) {}

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Post()
  create(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateColumnDto,
  ) {
    return this.kanbanService.createColumn(projectId, user.id, dto);
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Patch("reorder")
  reorder(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.kanbanService.reorderColumns(projectId, user.id, dto);
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Patch(":columnId")
  update(
    @Param("projectId") projectId: string,
    @Param("columnId") columnId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.kanbanService.updateColumn(projectId, columnId, dto);
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Delete(":columnId")
  delete(
    @Param("projectId") projectId: string,
    @Param("columnId") columnId: string,
    @Query("targetColumnId") targetColumnId?: string,
  ) {
    return this.kanbanService.deleteColumn(projectId, columnId, targetColumnId);
  }
}
