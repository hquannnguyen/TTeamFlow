import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ActivityLogsModule } from "./modules/activity-logs/activity-logs.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { HealthModule } from "./modules/health/health.module";
import { KanbanModule } from "./modules/kanban/kanban.module";
import { ProjectMembersModule } from "./modules/project-members/project-members.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ProjectMembersModule,
    KanbanModule,
    TasksModule,
    DashboardModule,
    ActivityLogsModule,
  ],
})
export class AppModule {}
