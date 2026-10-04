import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ProjectRoleGuard } from "../../common/guards/project-role.guard";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AddProjectMemberDto } from "./dto/add-project-member.dto";
import { UpdateProjectMemberRoleDto } from "./dto/update-project-member-role.dto";
import { ProjectMembersService } from "./project-members.service";

@Controller("projects/:projectId/members")
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class ProjectMembersController {
  constructor(private readonly service: ProjectMembersService) {}

  @ProjectRoles(
    ProjectRole.OWNER,
    ProjectRole.MANAGER,
    ProjectRole.MEMBER,
    ProjectRole.VIEWER,
  )
  @Get()
  list(@Param("projectId") projectId: string) {
    return this.service.list(projectId);
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Post()
  add(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.service.add(projectId, user.id, dto);
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Patch(":userId")
  updateRole(
    @Param("projectId") projectId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProjectMemberRoleDto,
  ) {
    return this.service.updateRole(projectId, user.id, targetUserId, dto);
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Delete(":userId")
  remove(
    @Param("projectId") projectId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(projectId, user.id, targetUserId);
  }
}
