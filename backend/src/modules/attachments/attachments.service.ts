import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NotificationType, ProjectRole, ProjectStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { S3Service } from "../../common/s3/s3.service";
import {
  MAX_ATTACHMENTS_PER_TASK,
  PresignAttachmentDto,
} from "./dto/presign-attachment.dto";

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  /** Kiểm tra task tồn tại + actor phải là MEMBER trở lên + dự án không ARCHIVED */
  private async getTaskAndAssertWriteAccess(taskId: string, actorId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        project: { select: { id: true, status: true, projectKey: true } },
      },
    });
    if (!task) {
      throw new NotFoundException("Task không tồn tại");
    }
    if (task.project.status === ProjectStatus.ARCHIVED) {
      throw new ForbiddenException("Dự án đã lưu trữ, chỉ đọc");
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: actorId },
      },
    });
    if (!member || member.role === ProjectRole.VIEWER) {
      throw new ForbiddenException("Bạn không có quyền đính kèm tệp");
    }

    return task;
  }

  private async getTaskAndAssertReadAccess(taskId: string, actorId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException("Task không tồn tại");
    }
    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: task.projectId, userId: actorId },
      },
    });
    if (!member) {
      throw new ForbiddenException("Bạn không có quyền trong dự án này");
    }
    return task;
  }

  /**
   * Bước 1 của upload: kiểm tra hợp lệ, tạo record chưa hoàn tất,
   * trả về presigned URL để client PUT file thẳng lên MinIO.
   */
  async presign(taskId: string, actorId: string, dto: PresignAttachmentDto) {
    await this.getTaskAndAssertWriteAccess(taskId, actorId);

    const count = await this.prisma.attachment.count({
      where: { taskId, isUploaded: true },
    });
    if (count >= MAX_ATTACHMENTS_PER_TASK) {
      throw new BadRequestException("Task chỉ đính kèm tối đa 20 tệp");
    }

    const attachmentId = randomUUID();
    const safeName = dto.fileName.replace(/[\r\n\\]/g, "_").slice(0, 200);
    const objectKey = `attachments/${taskId}/${attachmentId}/${safeName}`;

    const uploadUrl = await this.s3.getUploadUrl(objectKey, dto.mimeType);

    const attachment = await this.prisma.attachment.create({
      data: {
        id: attachmentId,
        taskId,
        uploaderId: actorId,
        objectKey,
        fileName: safeName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
      },
    });

    return { attachment, uploadUrl };
  }

  /**
   * Bước 2: client báo đã PUT xong — backend xác minh object tồn tại
   * trên MinIO rồi mới đánh dấu tệp hợp lệ.
   */
  async complete(attachmentId: string, actorId: string) {
    const attachment = await this.getAttachmentForWrite(attachmentId, actorId);

    if (attachment.isUploaded) {
      return attachment;
    }

    const exists = await this.s3.objectExists(attachment.objectKey);
    if (!exists) {
      throw new BadRequestException("Chưa tìm thấy tệp trên kho lưu trữ");
    }

    const updated = await this.prisma.attachment.update({
      where: { id: attachment.id },
      data: { isUploaded: true },
    });

    // Ghi nhật ký hoạt động (append-only) + thông báo cho assignee
    const taskInfo = await this.prisma.task.findUnique({
      where: { id: updated.taskId },
      select: { projectId: true, taskNumber: true, title: true },
    });
    if (taskInfo) {
      await this.prisma.activityLog.create({
        data: {
          projectId: taskInfo.projectId,
          actorId,
          action: "ATTACHMENT_ADDED",
          entityType: "Attachment",
          entityId: updated.id,
          metadata: {
            fileName: updated.fileName,
            sizeBytes: updated.sizeBytes,
          },
        },
      });

      const assignees = await this.prisma.taskAssignment.findMany({
        where: { taskId: updated.taskId, userId: { not: actorId } },
        select: { userId: true },
      });
      if (assignees.length > 0) {
        await this.prisma.notification.createMany({
          data: assignees.map((a) => ({
            userId: a.userId,
            actorId,
            projectId: taskInfo.projectId,
            taskId: updated.taskId,
            type: NotificationType.SYSTEM,
            title: "Tệp đính kèm mới",
            content:
              `Đã thêm tệp "${updated.fileName}" vào task #${taskInfo.taskNumber ?? ""} ${taskInfo.title}`.trim(),
          })),
        });
      }
    }

    return updated;
  }

  async findAllByTask(taskId: string, actorId: string) {
    await this.getTaskAndAssertReadAccess(taskId, actorId);

    const attachments = await this.prisma.attachment.findMany({
      where: { taskId, isUploaded: true },
      orderBy: { createdAt: "asc" },
      include: {
        uploader: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    // Mỗi tệp có link tải riêng, hết hạn sau PRESIGN_URL_TTL giây
    const items = await Promise.all(
      attachments.map(async (a) => ({
        ...a,
        downloadUrl: await this.s3.getDownloadUrl(a.objectKey),
      })),
    );

    return { data: items };
  }

  async remove(attachmentId: string, actorId: string) {
    const attachment = await this.getAttachmentForWrite(attachmentId, actorId);

    await this.prisma.attachment.delete({ where: { id: attachment.id } });
    await this.s3.deleteObject(attachment.objectKey);

    return { id: attachment.id };
  }

  /**
   * Quy tắc xoá/sửa tệp: người upload đó, hoặc MANAGER/OWNER của dự án.
   */
  private async getAttachmentForWrite(attachmentId: string, actorId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          select: {
            id: true,
            projectId: true,
            deletedAt: true,
            project: { select: { status: true } },
          },
        },
      },
    });
    if (!attachment || attachment.task.deletedAt !== null) {
      throw new NotFoundException("Tệp đính kèm không tồn tại");
    }
    if (attachment.task.project.status === ProjectStatus.ARCHIVED) {
      throw new ForbiddenException("Dự án đã lưu trữ, chỉ đọc");
    }

    const member = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: attachment.task.projectId,
          userId: actorId,
        },
      },
    });
    if (!member) {
      throw new ForbiddenException("Bạn không có quyền trong dự án này");
    }

    const canManage =
      attachment.uploaderId === actorId ||
      member.role === ProjectRole.OWNER ||
      member.role === ProjectRole.MANAGER;
    if (!canManage) {
      throw new ForbiddenException("Bạn không có quyền thao tác với tệp này");
    }

    return attachment;
  }
}
