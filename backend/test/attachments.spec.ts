/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import assert from "node:assert";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ProjectRole, ProjectStatus } from "@prisma/client";
import { AttachmentsService } from "../src/modules/attachments/attachments.service";
import { MAX_ATTACHMENT_SIZE } from "../src/modules/attachments/dto/presign-attachment.dto";

/** Mock S3Service — không cần MinIO thật khi test */
function makeMockS3() {
  return {
    getUploadUrl: async (key: string) => `http://minio/upload/${key}`,
    getDownloadUrl: async (key: string) => `http://minio/download/${key}`,
    objectExists: async () => true,
    deleteObject: async () => undefined,
  };
}

const activeTask = {
  id: "task-1",
  projectId: "proj-1",
  deletedAt: null,
  project: { id: "proj-1", status: ProjectStatus.ACTIVE, projectKey: "SHOP" },
};

async function runTests() {
  console.log(
    "🚀 Bắt đầu kiểm thử Attachments (presign, complete, quyền)...\n",
  );

  // 1. MEMBER presign thành công
  {
    const created = {
      id: "att-1",
      taskId: "task-1",
      uploaderId: "user-1",
      objectKey: "attachments/task-1/att-1/bao-cao.pdf",
      fileName: "bao-cao.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      isUploaded: false,
      createdAt: new Date(),
    };
    const mockPrisma: any = {
      task: { findFirst: async () => activeTask },
      projectMember: { findUnique: async () => ({ role: ProjectRole.MEMBER }) },
      attachment: { count: async () => 0, create: async () => created },
    };
    const service = new AttachmentsService(mockPrisma, makeMockS3() as any);
    const result = await service.presign("task-1", "user-1", {
      fileName: "bao-cao.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });

    assert.strictEqual(result.attachment.id, "att-1");
    assert.ok(result.uploadUrl.includes("http://minio/upload/"));
    console.log("✔ Test 1: MEMBER xin presigned URL thành công");
  }

  // 2. VIEWER không được presign
  {
    const mockPrisma: any = {
      task: { findFirst: async () => activeTask },
      projectMember: { findUnique: async () => ({ role: ProjectRole.VIEWER }) },
    };
    const service = new AttachmentsService(mockPrisma, makeMockS3() as any);
    await assert.rejects(
      () =>
        service.presign("task-1", "user-1", {
          fileName: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1,
        }),
      ForbiddenException,
    );
    console.log("✔ Test 2: VIEWER bị từ chối presign");
  }

  // 3. Dự án ARCHIVED chỉ đọc
  {
    const archivedTask = {
      ...activeTask,
      project: { status: ProjectStatus.ARCHIVED },
    };
    const mockPrisma: any = {
      task: { findFirst: async () => archivedTask },
    };
    const service = new AttachmentsService(mockPrisma, makeMockS3() as any);
    await assert.rejects(
      () =>
        service.presign("task-1", "user-1", {
          fileName: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1,
        }),
      ForbiddenException,
    );
    console.log("✔ Test 3: Dự án ARCHIVED chặn đính kèm");
  }

  // 4. Task không tồn tại
  {
    const mockPrisma: any = {
      task: { findFirst: async () => null },
    };
    const service = new AttachmentsService(mockPrisma, makeMockS3() as any);
    await assert.rejects(
      () =>
        service.presign("task-x", "user-1", {
          fileName: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1,
        }),
      NotFoundException,
    );
    console.log("✔ Test 4: Task không tồn tại trả 404");
  }

  // 5. Vượt giới hạn 20 tệp
  {
    const mockPrisma: any = {
      task: { findFirst: async () => activeTask },
      projectMember: { findUnique: async () => ({ role: ProjectRole.MEMBER }) },
      attachment: { count: async () => 20 },
    };
    const service = new AttachmentsService(mockPrisma, makeMockS3() as any);
    await assert.rejects(
      () =>
        service.presign("task-1", "user-1", {
          fileName: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1,
        }),
      BadRequestException,
    );
    console.log("✔ Test 5: Chặn khi task đã đủ 20 tệp");
  }

  // 6. complete: object chưa tồn tại trên MinIO -> lỗi
  {
    const attachment = {
      id: "att-1",
      taskId: "task-1",
      uploaderId: "user-1",
      objectKey: "attachments/task-1/att-1/a.pdf",
      isUploaded: false,
      task: {
        id: "task-1",
        projectId: "proj-1",
        deletedAt: null,
        project: { status: ProjectStatus.ACTIVE },
      },
    };
    const mockPrisma: any = {
      attachment: { findUnique: async () => attachment },
      projectMember: { findUnique: async () => ({ role: ProjectRole.MEMBER }) },
    };
    const mockS3 = makeMockS3();
    mockS3.objectExists = async () => false;
    const service = new AttachmentsService(mockPrisma, mockS3 as any);
    await assert.rejects(
      () => service.complete("att-1", "user-1"),
      BadRequestException,
    );
    console.log("✔ Test 6: complete từ chối khi object chưa upload");
  }

  // 7. complete thành công: ghi log + thông báo assignee
  {
    const attachment = {
      id: "att-1",
      taskId: "task-1",
      uploaderId: "user-1",
      objectKey: "attachments/task-1/att-1/a.pdf",
      isUploaded: false,
      task: {
        id: "task-1",
        projectId: "proj-1",
        deletedAt: null,
        project: { status: ProjectStatus.ACTIVE },
      },
    };
    const updated = { ...attachment, isUploaded: true };
    let logCreated = false;
    let notificationCount = 0;
    const mockPrisma: any = {
      attachment: {
        findUnique: async () => attachment,
        update: async () => updated,
      },
      projectMember: { findUnique: async () => ({ role: ProjectRole.MEMBER }) },
      task: {
        findUnique: async () => ({
          projectId: "proj-1",
          taskNumber: 5,
          title: "Giỏ hàng",
        }),
      },
      activityLog: {
        create: async () => {
          logCreated = true;
          return {};
        },
      },
      taskAssignment: {
        findMany: async () => [{ userId: "user-2" }, { userId: "user-3" }],
      },
      notification: {
        createMany: async (args: any) => {
          notificationCount = args.data.length;
          return {};
        },
      },
    };
    const service = new AttachmentsService(mockPrisma, makeMockS3() as any);
    const result = await service.complete("att-1", "user-1");

    assert.strictEqual(result.isUploaded, true);
    assert.strictEqual(logCreated, true);
    assert.strictEqual(notificationCount, 2);
    console.log("✔ Test 7: complete ghi ActivityLog + thông báo 2 assignee");
  }

  // 8. MEMBER khác không xoá được tệp của người khác
  {
    const attachment = {
      id: "att-1",
      taskId: "task-1",
      uploaderId: "user-99",
      objectKey: "attachments/task-1/att-1/a.pdf",
      task: {
        id: "task-1",
        projectId: "proj-1",
        deletedAt: null,
        project: { status: ProjectStatus.ACTIVE },
      },
    };
    const mockPrisma: any = {
      attachment: { findUnique: async () => attachment },
      projectMember: { findUnique: async () => ({ role: ProjectRole.MEMBER }) },
    };
    const service = new AttachmentsService(mockPrisma, makeMockS3() as any);
    await assert.rejects(
      () => service.remove("att-1", "user-1"),
      ForbiddenException,
    );
    console.log("✔ Test 8: MEMBER không xoá tệp của người khác");
  }

  // 9. MANAGER xoá được tệp của người khác
  {
    const attachment = {
      id: "att-1",
      taskId: "task-1",
      uploaderId: "user-99",
      objectKey: "attachments/task-1/att-1/a.pdf",
      task: {
        id: "task-1",
        projectId: "proj-1",
        deletedAt: null,
        project: { status: ProjectStatus.ACTIVE },
      },
    };
    const mockPrisma: any = {
      attachment: {
        findUnique: async () => attachment,
        delete: async () => attachment,
      },
      projectMember: {
        findUnique: async () => ({ role: ProjectRole.MANAGER }),
      },
    };
    const service = new AttachmentsService(mockPrisma, makeMockS3() as any);
    const result = await service.remove("att-1", "user-1");
    assert.strictEqual(result.id, "att-1");
    console.log("✔ Test 9: MANAGER xoá tệp của thành viên khác");
  }

  // 10. Hằng số giới hạn hợp lý
  {
    assert.strictEqual(MAX_ATTACHMENT_SIZE, 10 * 1024 * 1024);
    console.log("✔ Test 10: Giới hạn kích thước tệp là 10MB");
  }

  console.log("\n✅ Tất cả ca kiểm thử Attachments đều đạt!");
}

runTests().catch((error) => {
  console.error("❌ Kiểm thử thất bại:", error);
  process.exit(1);
});
