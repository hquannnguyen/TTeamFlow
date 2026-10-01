import { IsEnum } from "class-validator";
import { ProjectRole } from "@prisma/client";

export class UpdateProjectMemberRoleDto {
  @IsEnum(ProjectRole, { message: "Vai trò không hợp lệ" })
  role: ProjectRole;
}
