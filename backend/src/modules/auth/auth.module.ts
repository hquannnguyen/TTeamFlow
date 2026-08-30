import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ProjectRoleGuard } from "../../common/guards/project-role.guard";
import { SystemRoleGuard } from "../../common/guards/system-role.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: SystemRoleGuard },
    { provide: APP_GUARD, useClass: ProjectRoleGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
