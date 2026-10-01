import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProjectRole, ProjectStatus } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ProjectRoleGuard } from "../../common/guards/project-role.guard";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: ProjectStatus,
    @Query("scope") scope?: "all" | "my",
    @Query("ownerId") ownerId?: string,
  ) {
    return this.projectsService.listForUser(
      user.id,
      user.systemRole,
      status,
      scope,
      ownerId,
    );
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
    return this.projectsService.findOne(projectId, user.id, user.systemRole);
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Patch(":projectId")
  update(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(
      projectId,
      user.id,
      dto,
      user.systemRole,
    );
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Patch(":projectId/archive")
  archive(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.archive(projectId, user.id, user.systemRole);
  }

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER)
  @Patch(":projectId/restore")
  restore(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.restore(projectId, user.id, user.systemRole);
  }

  @ProjectRoles(ProjectRole.OWNER)
  @Delete(":projectId")
  remove(@Param("projectId") projectId: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.remove(projectId, user.id, user.systemRole);
  }
}
