/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import assert from "node:assert";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ProjectRole, ProjectStatus } from "@prisma/client";
import { CommentsService } from "../src/modules/comments/comments.service";

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử Comments CRUD (Task 18)...\n");

  // 1. Create comment successfully
  {
    const fakeTask = {
      id: "task-1",
      projectId: "proj-1",
      deletedAt: null,
      project: { id: "proj-1", status: ProjectStatus.ACTIVE },
    };

    const createdComment = {
      id: "comment-1",
      taskId: "task-1",
      userId: "user-1",
      content: "Đây là bình luận mới",
      createdAt: new Date(),
      user: {
        id: "user-1",
        fullName: "PhongVV",
        avatarUrl: null,
        email: "phong@example.com",
      },
    };

    const mockPrisma: any = {
      task: { findFirst: async () => fakeTask },
      projectMember: { findUnique: async () => ({ role: ProjectRole.MEMBER }) },
      comment: { create: async () => createdComment },
    };

    const service = new CommentsService(mockPrisma);
    const result = await service.create("task-1", "user-1", {
      content: "Đây là bình luận mới",
    });

    assert.strictEqual(result.id, "comment-1");
    assert.strictEqual(result.content, "Đây là bình luận mới");
    console.log("✔ Test 1: Tạo comment thành công với role hợp lệ");
  }

  // 2. VIEWER cannot create comment
  {
    const fakeTask = {
      id: "task-1",
      projectId: "proj-1",
      deletedAt: null,
      project: { id: "proj-1", status: ProjectStatus.ACTIVE },
    };

    const mockPrisma: any = {
      task: { findFirst: async () => fakeTask },
      projectMember: { findUnique: async () => ({ role: ProjectRole.VIEWER }) },
    };

    const service = new CommentsService(mockPrisma);
    await assert.rejects(
      () =>
        service.create("task-1", "viewer-1", { content: "Không được comment" }),
      ForbiddenException,
    );
    console.log("✔ Test 2: Chặn role VIEWER tạo comment");
  }

  // 3. Reject create comment when project ARCHIVED
  {
    const fakeTask = {
      id: "task-1",
      projectId: "proj-1",
      deletedAt: null,
      project: { id: "proj-1", status: ProjectStatus.ARCHIVED },
    };

    const mockPrisma: any = {
      task: { findFirst: async () => fakeTask },
    };

    const service = new CommentsService(mockPrisma);
    await assert.rejects(
      () =>
        service.create("task-1", "user-1", {
          content: "Comment trên project lưu trữ",
        }),
      BadRequestException,
    );
    console.log("✔ Test 3: Chặn tạo comment khi project đã ARCHIVED");
  }

  // 4. Owner can update comment
  {
    const fakeComment = {
      id: "comment-1",
      userId: "user-owner",
      content: "Cũ",
      task: {
        deletedAt: null,
        project: { status: ProjectStatus.ACTIVE },
      },
    };

    const mockPrisma: any = {
      comment: {
        findUnique: async () => fakeComment,
        update: async (args: any) => ({
          ...fakeComment,
          content: args.data.content,
        }),
      },
    };

    const service = new CommentsService(mockPrisma);
    const result = await service.update("comment-1", "user-owner", {
      content: "Mới",
    });
    assert.strictEqual(result.content, "Mới");
    console.log("✔ Test 4: Chủ sở hữu cập nhật thành công comment");
  }

  // 5. Non-owner cannot update comment
  {
    const fakeComment = {
      id: "comment-1",
      userId: "user-owner",
      content: "Cũ",
      task: {
        deletedAt: null,
        project: { status: ProjectStatus.ACTIVE },
      },
    };

    const mockPrisma: any = {
      comment: { findUnique: async () => fakeComment },
    };

    const service = new CommentsService(mockPrisma);
    await assert.rejects(
      () =>
        service.update("comment-1", "other-user", { content: "Hack comment" }),
      ForbiddenException,
    );
    console.log("✔ Test 5: Chặn người khác sửa comment");
  }

  // 6. Owner can remove comment
  {
    const fakeComment = {
      id: "comment-1",
      userId: "user-owner",
      task: {
        deletedAt: null,
        project: { status: ProjectStatus.ACTIVE },
      },
    };

    let deleted = false;
    const mockPrisma: any = {
      comment: {
        findUnique: async () => fakeComment,
        delete: async () => {
          deleted = true;
        },
      },
    };

    const service = new CommentsService(mockPrisma);
    const result = await service.remove("comment-1", "user-owner");
    assert.strictEqual(result.success, true);
    assert.strictEqual(deleted, true);
    console.log("✔ Test 6: Chủ sở hữu xóa thành công comment");
  }

  // 7. Non-owner cannot remove comment
  {
    const fakeComment = {
      id: "comment-1",
      userId: "user-owner",
      task: {
        deletedAt: null,
        project: { status: ProjectStatus.ACTIVE },
      },
    };

    const mockPrisma: any = {
      comment: { findUnique: async () => fakeComment },
    };

    const service = new CommentsService(mockPrisma);
    await assert.rejects(
      () => service.remove("comment-1", "other-user"),
      ForbiddenException,
    );
    console.log("✔ Test 7: Chặn người khác xóa comment");
  }

  console.log("\n🎉 Tất cả test Comments (Task 18) đã thành công!\n");
}

void runTests();
