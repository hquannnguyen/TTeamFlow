import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { ChecklistsService } from "./checklists.service";
import { CreateChecklistItemDto } from "./dto/create-checklist-item.dto";
import { UpdateChecklistItemDto } from "./dto/update-checklist-item.dto";

@Controller()
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Get([
    "tasks/:taskId/checklists",
    "projects/:projectId/tasks/:taskId/checklists",
  ])
  findAll(@Param("taskId") taskId: string, @CurrentUser() user: AuthUser) {
    return this.checklistsService.findAll(taskId, user.id);
  }

  @Post([
    "tasks/:taskId/checklists",
    "projects/:projectId/tasks/:taskId/checklists",
  ])
  create(
    @Param("taskId") taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() createChecklistItemDto: CreateChecklistItemDto,
  ) {
    return this.checklistsService.create(
      taskId,
      user.id,
      createChecklistItemDto,
    );
  }

  @Patch(["checklists/:id", "projects/:projectId/tasks/:taskId/checklists/:id"])
  update(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() updateChecklistItemDto: UpdateChecklistItemDto,
  ) {
    return this.checklistsService.update(id, user.id, updateChecklistItemDto);
  }

  @Delete([
    "checklists/:id",
    "projects/:projectId/tasks/:taskId/checklists/:id",
  ])
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.checklistsService.remove(id, user.id);
  }
}
