import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { ProjectMembersController } from "./project-members.controller";
import { ProjectMembersService } from "./project-members.service";

@Module({
  imports: [NotificationsModule],
  controllers: [ProjectMembersController],
  providers: [ProjectMembersService],
})
export class ProjectMembersModule {}
