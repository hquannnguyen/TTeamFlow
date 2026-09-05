import { Controller, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { ProjectRole } from '@prisma/client';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectRoleGuard } from '../../common/guards/project-role.guard';
import { ProjectRoles } from '../../common/decorators/project-roles.decorator';

@Controller('projects/:projectId/tasks/:taskId/checklists') // Cấu trúc Nested Route RESTful
@UseGuards(JwtAuthGuard, ProjectRoleGuard)
export class ChecklistsController {
    constructor(private readonly checklistsService: ChecklistsService) { }

    // Chỉ Owner, Manager, Member mới được tạo checklist
    @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER, ProjectRole.MEMBER)
    @Post()
    create(
        @Param('taskId') taskId: string,
        @Body() createChecklistItemDto: CreateChecklistItemDto,
    ) {
        return this.checklistsService.create(taskId, createChecklistItemDto);
    }

    @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER, ProjectRole.MEMBER)
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateChecklistItemDto: UpdateChecklistItemDto,
    ) {
        return this.checklistsService.update(id, updateChecklistItemDto);
    }

    @ProjectRoles(ProjectRole.OWNER, ProjectRole.MANAGER, ProjectRole.MEMBER)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.checklistsService.remove(id);
    }
}