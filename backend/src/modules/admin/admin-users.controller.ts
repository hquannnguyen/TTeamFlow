import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SystemRoles } from "../../common/decorators/system-roles.decorator";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AdminUsersService } from "./admin-users.service";
import { QueryUsersDto } from "./dto/query-users.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@Controller("admin/users")
@SystemRoles(SystemRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  getUsers(@Query() query: QueryUsersDto) {
    return this.adminUsersService.getUsers(query);
  }

  @Get(":userId")
  getUserById(@Param("userId", ParseUUIDPipe) userId: string) {
    return this.adminUsersService.getUserById(userId);
  }

  @Patch(":userId/status")
  updateUserStatus(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() admin: AuthUser,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateUserStatus(userId, admin.id, dto);
  }
}

