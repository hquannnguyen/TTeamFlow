import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AddProjectMemberDto } from "./dto/add-project-member.dto";
import { ProjectMembersService } from "./project-members.service";

@Controller("projects/:projectId/members")
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
}
