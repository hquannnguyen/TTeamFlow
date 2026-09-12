import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreateTaskDto } from "./dto/create-task.dto";
import { MoveTaskDto } from "./dto/move-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@Controller()
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER, ProjectRole.MEMBER)
  @Post("projects/:projectId/tasks")
  create(
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.service.create(projectId, user.id, dto);
  }

  @Patch("tasks/:taskId/move")
  move(
    @Param("taskId") taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: MoveTaskDto,
  ) {
    return this.service.move(taskId, user.id, dto);
  }

  @Get("tasks/:taskId")
  getDetail(@Param("taskId") taskId: string, @CurrentUser() user: AuthUser) {
    return this.service.getDetail(taskId, user.id);
  }

  @Patch("tasks/:taskId")
  update(
    @Param("taskId") taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.service.update(taskId, user.id, dto);
  }

  @Delete("tasks/:taskId")
  remove(@Param("taskId") taskId: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(taskId, user.id);
  }

  @Post("tasks/:taskId/assignees/:userId")
  assign(
    @Param("taskId") taskId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.assign(taskId, user.id, targetUserId);
  }

  @Delete("tasks/:taskId/assignees/:userId")
  unassign(
    @Param("taskId") taskId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.unassign(taskId, user.id, targetUserId);
  }
}
