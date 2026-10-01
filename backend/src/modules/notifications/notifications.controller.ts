import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { QueryNotificationsDto } from "./dto/query-notifications.dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  getUserNotifications(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.service.getUserNotifications(user.id, query);
  }

  @Get("unread-count")
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.service.getUnreadCount(user.id);
  }

  @Patch("mark-all-read")
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.service.markAllAsRead(user.id);
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.service.markAsRead(id, user.id);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.id);
  }
}
