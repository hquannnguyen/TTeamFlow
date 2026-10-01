/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import assert from "node:assert";
import { ForbiddenException } from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { NotificationsService } from "../src/modules/notifications/notifications.service";

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử Notifications Service...\n");

  const userId = "user-1";
  const otherUserId = "user-2";

  // 1. getUserNotifications
  {
    const fakeList = [
      {
        id: "notif-1",
        userId,
        actorId: otherUserId,
        type: NotificationType.TASK_ASSIGNED,
        title: "Phân công nhiệm vụ",
        content: "Bạn đã được phân công",
        isRead: false,
        createdAt: new Date(),
        actor: { id: otherUserId, fullName: "QuanNH", avatarUrl: null },
      },
    ];

    const mockPrisma: any = {
      notification: {
        count: async ({ where }: any) => (where.isRead === false ? 1 : 1),
        findMany: async () => fakeList,
      },
    };

    const service = new NotificationsService(mockPrisma);
    const result = await service.getUserNotifications(userId, {
      page: 1,
      limit: 10,
    });

    assert.strictEqual(result.data.length, 1);
    assert.strictEqual(result.meta.unreadCount, 1);
    assert.strictEqual(result.meta.page, 1);
    console.log("✔ Test 1: Lấy danh sách thông báo phân trang thành công");
  }

  // 2. getUnreadCount
  {
    const mockPrisma: any = {
      notification: {
        count: async () => 5,
      },
    };

    const service = new NotificationsService(mockPrisma);
    const result = await service.getUnreadCount(userId);
    assert.strictEqual(result.unreadCount, 5);
    console.log("✔ Test 2: Đếm số lượng thông báo chưa đọc chính xác");
  }

  // 3. markAsRead - Owner can mark as read
  {
    const fakeNotif = {
      id: "notif-1",
      userId,
      isRead: false,
    };

    let updated = false;
    const mockPrisma: any = {
      notification: {
        findUnique: async () => fakeNotif,
        update: async () => {
          updated = true;
          return { ...fakeNotif, isRead: true, readAt: new Date() };
        },
      },
    };

    const service = new NotificationsService(mockPrisma);
    const result = await service.markAsRead("notif-1", userId);
    assert.strictEqual(result.isRead, true);
    assert.strictEqual(updated, true);
    console.log("✔ Test 3: Chủ sở hữu đánh dấu thông báo đã đọc thành công");
  }

  // 4. markAsRead - Non-owner cannot mark as read
  {
    const fakeNotif = {
      id: "notif-1",
      userId,
      isRead: false,
    };

    const mockPrisma: any = {
      notification: {
        findUnique: async () => fakeNotif,
      },
    };

    const service = new NotificationsService(mockPrisma);
    await assert.rejects(
      () => service.markAsRead("notif-1", otherUserId),
      ForbiddenException,
    );
    console.log("✔ Test 4: Chặn người khác đánh dấu đã đọc thông báo");
  }

  // 5. markAllAsRead
  {
    let countUpdated = 0;
    const mockPrisma: any = {
      notification: {
        updateMany: async () => {
          countUpdated = 3;
          return { count: 3 };
        },
      },
    };

    const service = new NotificationsService(mockPrisma);
    const result = await service.markAllAsRead(userId);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.updatedCount, 3);
    assert.strictEqual(countUpdated, 3);
    console.log("✔ Test 5: Đánh dấu tất cả thông báo là đã đọc thành công");
  }

  // 6. Self-notification prevention
  {
    let created = false;
    const mockPrisma: any = {
      notification: {
        create: async () => {
          created = true;
          return {};
        },
      },
    };

    const service = new NotificationsService(mockPrisma);
    const result = await service.create({
      userId,
      actorId: userId, // Same user on comment -> must be ignored
      type: NotificationType.TASK_COMMENTED,
      title: "Test",
      content: "Test",
    });

    assert.strictEqual(result, null);
    assert.strictEqual(created, false);
    console.log(
      "✔ Test 6: Tự động loại bỏ thông báo tự gửi cho chính mình khi bình luận (Self-notification)",
    );
  }

  // 7. remove - Owner can remove, Non-owner blocked
  {
    const fakeNotif = {
      id: "notif-1",
      userId,
    };

    let deleted = false;
    const mockPrisma: any = {
      notification: {
        findUnique: async () => fakeNotif,
        delete: async () => {
          deleted = true;
          return {};
        },
      },
    };

    const service = new NotificationsService(mockPrisma);
    const res = await service.remove("notif-1", userId);
    assert.strictEqual(res.success, true);
    assert.strictEqual(deleted, true);

    await assert.rejects(
      () => service.remove("notif-1", otherUserId),
      ForbiddenException,
    );
    console.log("✔ Test 7: Phân quyền xóa thông báo chính xác");
  }

  // 8. createMany filters out self comments but allows task assignments
  {
    let createdBatch: any[] = [];
    const mockPrisma: any = {
      notification: {
        createMany: async ({ data }: any) => {
          createdBatch = data;
          return { count: data.length };
        },
      },
    };

    const service = new NotificationsService(mockPrisma);
    const result = await service.createMany([
      {
        userId: "user-target",
        actorId: "user-creator",
        type: NotificationType.TASK_ASSIGNED,
        title: "Gán task",
        content: "Bạn đã được gán task",
      },
      {
        userId: "user-creator",
        actorId: "user-creator",
        type: NotificationType.TASK_ASSIGNED, // Self assignment is preserved!
        title: "Gán task cho bản thân",
        content: "Nội dung",
      },
      {
        userId: "user-creator",
        actorId: "user-creator",
        type: NotificationType.TASK_COMMENTED, // Self comment is filtered!
        title: "Bình luận bản thân",
        content: "Nội dung",
      },
    ]);

    assert.strictEqual(result.count, 2);
    assert.strictEqual(createdBatch.length, 2);
    assert.strictEqual(createdBatch[0].userId, "user-target");
    assert.strictEqual(createdBatch[1].userId, "user-creator");
    console.log(
      "✔ Test 8: createMany giữ thông báo gán task và lọc bỏ tự bình luận",
    );
  }

  console.log("\n🎉 Tất cả test Notifications Service đã thành công 100%!\n");
}

void runTests();
