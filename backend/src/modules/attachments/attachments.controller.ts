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
import { AttachmentsService } from "./attachments.service";
import { PresignAttachmentDto } from "./dto/presign-attachment.dto";

@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  /** Bước 1: xin presigned URL để upload thẳng lên MinIO */
  @Post([
    "tasks/:taskId/attachments/presign",
    "projects/:projectId/tasks/:taskId/attachments/presign",
  ])
  presign(
    @Param("taskId") taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PresignAttachmentDto,
  ) {
    return this.attachmentsService.presign(taskId, user.id, dto);
  }

  /** Bước 2: xác nhận đã upload xong */
  @Patch("attachments/:id/complete")
  complete(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.attachmentsService.complete(id, user.id);
  }

  @Get([
    "tasks/:taskId/attachments",
    "projects/:projectId/tasks/:taskId/attachments",
  ])
  findAllByTask(
    @Param("taskId") taskId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachmentsService.findAllByTask(taskId, user.id);
  }

  @Delete(["attachments/:id", "projects/:projectId/attachments/:id"])
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.attachmentsService.remove(id, user.id);
  }
}
