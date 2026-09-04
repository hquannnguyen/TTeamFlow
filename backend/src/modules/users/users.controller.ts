import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthUser } from "../../common/interfaces/auth-user.interface";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.me(user.id);
  }

  @Patch("me")
  @HttpCode(200)
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch("me/avatar")
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("avatar", {
      storage: undefined, // dùng memory storage (buffer)
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  updateAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(user.id, file);
  }
}
