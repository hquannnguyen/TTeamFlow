import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ProjectRole } from "@prisma/client";
import { ProjectRoles } from "../../common/decorators/project-roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"; // Quy tắc 18: Guard xác thực
import { ProjectRoleGuard } from "../../common/guards/project-role.guard"; // Quy tắc 18: Guard phân quyền
import { KanbanService } from "./kanban.service";

@Controller("projects/:projectId/kanban")
@UseGuards(JwtAuthGuard, ProjectRoleGuard) // BẮT BUỘC: Bảo vệ endpoint bằng RBAC 2 tầng
export class KanbanController {
  // Đổi tên biến thành kanbanService cho rõ ràng
  constructor(private readonly kanbanService: KanbanService) { }

  @ProjectRoles(
    ProjectRole.OWNER,
    ProjectRole.MANAGER,
    ProjectRole.MEMBER,
    ProjectRole.VIEWER,
  )
  @Get()
  getKanbanBoard(@Param("projectId") projectId: string) { // Đổi tên hàm thành getKanbanBoard
    return this.kanbanService.getKanbanBoard(projectId);
  }
}
