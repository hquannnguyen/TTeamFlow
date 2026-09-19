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
import { CommentsService } from "./comments.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get(["tasks/:taskId/comments", "projects/:projectId/tasks/:taskId/comments"])
  findAll(@Param("taskId") taskId: string, @CurrentUser() user: AuthUser) {
    return this.commentsService.findAll(taskId, user.id);
  }

  @Post([
    "tasks/:taskId/comments",
    "projects/:projectId/tasks/:taskId/comments",
  ])
  create(
    @Param("taskId") taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(taskId, user.id, dto);
  }

  @Patch([
    "comments/:commentId",
    "comments/:id",
    "projects/:projectId/tasks/:taskId/comments/:commentId",
  ])
  update(
    @Param("commentId") commentId: string | undefined,
    @Param("id") id: string | undefined,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCommentDto,
  ) {
    const targetCommentId = commentId ?? id;
    return this.commentsService.update(targetCommentId!, user.id, dto);
  }

  @Delete([
    "comments/:commentId",
    "comments/:id",
    "projects/:projectId/tasks/:taskId/comments/:commentId",
  ])
  remove(
    @Param("commentId") commentId: string | undefined,
    @Param("id") id: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const targetCommentId = commentId ?? id;
    return this.commentsService.remove(targetCommentId!, user.id);
  }
}
