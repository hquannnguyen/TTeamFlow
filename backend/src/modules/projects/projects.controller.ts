import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.projectsService.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @ProjectRoles(
    ProjectRole.OWNER,
    ProjectRole.MANAGER,
    ProjectRole.MEMBER,
    ProjectRole.VIEWER,
  )
  @Get(":projectId")
  findOne(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.findOne(projectId, user.id);
  }
}
