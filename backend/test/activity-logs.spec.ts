/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument */
import assert from "node:assert";
import { Reflector } from "@nestjs/core";
import { ProjectRole } from "@prisma/client";
import { firstValueFrom, of } from "rxjs";
import { PROJECT_ROLES_KEY } from "../src/common/decorators/project-roles.decorator";
import { ResponseInterceptor } from "../src/common/interceptors/response.interceptor";
import { ActivityLogsController } from "../src/modules/activity-logs/activity-logs.controller";
import { ActivityLogsService } from "../src/modules/activity-logs/activity-logs.service";
import { ActivityAction } from "../src/modules/activity-logs/constants/activity-action.constant";
import { ActivityEntityType } from "../src/modules/activity-logs/constants/activity-entity.constant";
import type {
  ProjectUpdatedMetadata,
  TaskMovedMetadata,
} from "../src/modules/activity-logs/interfaces/metadata-contract.interface";
import { TasksService } from "../src/modules/tasks/tasks.service";
import type { PrismaService } from "../src/prisma/prisma.service";

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử Activity Logs (Task 20 - Sprint 2)...\n");

  const projectId = "11111111-1111-1111-1111-111111111111";
  const actorId = "99999999-9999-9999-9999-999999999999";
  const targetUserId = "88888888-8888-8888-8888-888888888888";
  const taskId = "task-1";

  // Mock DB Activity Logs: 30 logs TASK_MOVED, 15 logs PROJECT_UPDATED
  const mockLogs = Array.from({ length: 45 }, (_, i) => ({
    id: `log-${i + 1}`,
    projectId,
    actorId,
    action: i < 30 ? ActivityAction.TASK_MOVED : ActivityAction.PROJECT_UPDATED,
    entityType: i < 30 ? ActivityEntityType.TASK : ActivityEntityType.PROJECT,
    entityId: i < 30 ? taskId : projectId,
    metadata:
      i < 30
        ? { fromColumnId: "col-1", toColumnId: "col-2", newPosition: i * 1000 }
        : { updatedFields: ["name"] },
    createdAt: new Date(Date.now() - i * 1000),
    actor: { id: actorId, fullName: "User Test", avatarUrl: null },
  }));

  const mockPrisma = {
    activityLog: {
      count: async ({ where }: any) => {
        let filtered = mockLogs.filter((l) => l.projectId === where?.projectId);
        if (where?.action) {
          filtered = filtered.filter((l) => l.action === where.action);
        }
        if (where?.entityType) {
          filtered = filtered.filter((l) => l.entityType === where.entityType);
        }
        return filtered.length;
      },
      findMany: async ({ where, skip, take }: any) => {
        let filtered = mockLogs.filter((l) => l.projectId === where?.projectId);
        if (where?.action) {
          filtered = filtered.filter((l) => l.action === where.action);
        }
        if (where?.entityType) {
          filtered = filtered.filter((l) => l.entityType === where.entityType);
        }
        return filtered.slice(skip, skip + take);
      },
      create: async ({ data }: any) => {
        return { id: "log-new", ...data, createdAt: new Date() };
      },
    },
  } as unknown as PrismaService;

  const activityLogsService = new ActivityLogsService(mockPrisma);

  // TC-1: Phân trang Activity Log (page 1, limit 20)
  console.log("--- Test Case 1: Phân trang danh sách Activity Log ---");
  const page1 = await activityLogsService.list(projectId, {
    page: 1,
    limit: 20,
  });
  assert.strictEqual(page1.data.length, 20, "Trang 1 phải có 20 items");
  assert.strictEqual(page1.meta.page, 1, "Page phải là 1");
  assert.strictEqual(page1.meta.limit, 20, "Limit phải là 20");
  assert.strictEqual(page1.meta.total, 45, "Total phải là 45");
  assert.strictEqual(page1.meta.totalPages, 3, "TotalPages phải là 3");
  console.log(
    "✅ TC-1: Phân trang trang 1 đúng chuẩn (page=1, limit=20, total=45, totalPages=3)",
  );

  // TC-2: Phân trang trang 3 (page 3, limit 20) -> 5 items còn lại
  console.log("--- Test Case 2: Phân trang trang cuối ---");
  const page3 = await activityLogsService.list(projectId, {
    page: 3,
    limit: 20,
  });
  assert.strictEqual(page3.data.length, 5, "Trang 3 phải có 5 items còn lại");
  assert.strictEqual(page3.meta.page, 3, "Page phải là 3");
  console.log("✅ TC-2: Phân trang trang cuối trả về đúng 5 items còn lại");

  // TC-3: Lọc danh sách theo action
  console.log("--- Test Case 3: Lọc theo Action (TASK_MOVED) ---");
  const filteredByAction = await activityLogsService.list(projectId, {
    page: 1,
    limit: 50,
    action: ActivityAction.TASK_MOVED,
  });
  assert.strictEqual(
    filteredByAction.data.length,
    30,
    "Phải có đúng 30 log TASK_MOVED",
  );
  assert.strictEqual(
    filteredByAction.meta.total,
    30,
    "Total filtered phải là 30",
  );
  assert.ok(
    filteredByAction.data.every((l) => l.action === ActivityAction.TASK_MOVED),
    "Tất cả kết quả phải có action là TASK_MOVED",
  );
  console.log("✅ TC-3: Lọc theo action thành công, trả về đúng 30 bản ghi");

  // TC-4: Lọc danh sách theo entityType
  console.log("--- Test Case 4: Lọc theo EntityType (PROJECT) ---");
  const filteredByEntity = await activityLogsService.list(projectId, {
    page: 1,
    limit: 50,
    entityType: ActivityEntityType.PROJECT,
  });
  assert.strictEqual(
    filteredByEntity.data.length,
    15,
    "Phải có đúng 15 log entityType PROJECT",
  );
  assert.strictEqual(
    filteredByEntity.meta.total,
    15,
    "Total filtered phải là 15",
  );
  assert.ok(
    filteredByEntity.data.every(
      (l) => l.entityType === ActivityEntityType.PROJECT,
    ),
    "Tất cả kết quả phải có entityType là PROJECT",
  );
  console.log(
    "✅ TC-4: Lọc theo entityType thành công, trả về đúng 15 bản ghi",
  );

  // TC-5: Helper method ActivityLogsService.log với Metadata Contract
  console.log(
    "--- Test Case 5: Helper ghi log tự động & Metadata Contract ---",
  );
  const projectLog = await activityLogsService.log<ProjectUpdatedMetadata>({
    projectId,
    actorId,
    action: ActivityAction.PROJECT_UPDATED,
    entityType: ActivityEntityType.PROJECT,
    entityId: projectId,
    metadata: { updatedFields: ["name", "description"] },
  });
  assert.strictEqual(projectLog.action, ActivityAction.PROJECT_UPDATED);
  assert.strictEqual(projectLog.entityType, ActivityEntityType.PROJECT);
  assert.strictEqual(projectLog.projectId, projectId);
  assert.strictEqual(projectLog.actorId, actorId);
  assert.deepStrictEqual((projectLog as any).metadata, {
    updatedFields: ["name", "description"],
  });

  const taskLog = await activityLogsService.log<TaskMovedMetadata>({
    projectId,
    actorId,
    action: ActivityAction.TASK_MOVED,
    entityType: ActivityEntityType.TASK,
    entityId: taskId,
    metadata: {
      fromColumnId: "col-todo",
      toColumnId: "col-done",
      newPosition: 2000,
    },
  });
  assert.strictEqual(taskLog.action, ActivityAction.TASK_MOVED);
  assert.strictEqual(taskLog.entityType, ActivityEntityType.TASK);
  assert.deepStrictEqual((taskLog as any).metadata, {
    fromColumnId: "col-todo",
    toColumnId: "col-done",
    newPosition: 2000,
  });
  console.log(
    "✅ TC-5: Helper activityLogsService.log ghi log thành công với Metadata Contract chuẩn",
  );

  // TC-6: ResponseInterceptor hỗ trợ format phân trang data & meta
  console.log("--- Test Case 6: ResponseInterceptor chuẩn hóa data & meta ---");
  const interceptor = new ResponseInterceptor();
  const mockCallHandler = {
    handle: () => of(page1),
  };

  const intercepted$ = interceptor.intercept({} as any, mockCallHandler);
  const paginatedResult = (await firstValueFrom(intercepted$)) as any;

  assert.strictEqual(paginatedResult.success, true);
  assert.ok(Array.isArray(paginatedResult.data));
  assert.strictEqual(paginatedResult.data.length, 20);
  assert.deepStrictEqual(paginatedResult.meta, {
    page: 1,
    limit: 20,
    total: 45,
    totalPages: 3,
  });
  console.log(
    "✅ TC-6: ResponseInterceptor trả về cấu trúc chuẩn { success: true, data: [...], meta: {...} }",
  );

  // TC-7: ActivityLogsController RBAC permissions (OWNER, MANAGER, MEMBER, VIEWER)
  console.log("--- Test Case 7: Phân quyền ActivityLogsController ---");
  const reflector = new Reflector();
  const allowedRoles = reflector.get<ProjectRole[]>(
    PROJECT_ROLES_KEY,
    ActivityLogsController.prototype.list,
  );
  assert.deepStrictEqual(
    allowedRoles,
    [
      ProjectRole.OWNER,
      ProjectRole.MANAGER,
      ProjectRole.MEMBER,
      ProjectRole.VIEWER,
    ],
    "Activity log phải cho phép OWNER, MANAGER, MEMBER, VIEWER xem",
  );
  console.log(
    "✅ TC-7: ActivityLogsController cấu hình đầy đủ quyền đọc [OWNER, MANAGER, MEMBER, VIEWER]",
  );

  // TC-8: Kiểm tra tính chất Append-only (Không có API hoặc hàm nào cho phép sửa/xóa log)
  console.log("--- Test Case 8: Kiểm tra tính chất Append-only ---");
  const controllerMethods = Object.getOwnPropertyNames(
    ActivityLogsController.prototype,
  ).filter((m) => m !== "constructor");
  assert.deepStrictEqual(
    controllerMethods,
    ["list"],
    "ActivityLogsController CHỈ được phép có endpoint list, tuyệt đối không có update/delete",
  );

  const serviceMethods = Object.getOwnPropertyNames(
    ActivityLogsService.prototype,
  ).filter((m) => m !== "constructor");
  assert.deepStrictEqual(
    serviceMethods.sort(),
    ["list", "log"].sort(),
    "ActivityLogsService CHỈ được phép có list và log (append-only), không có update/delete",
  );
  console.log(
    "✅ TC-8: Khẳng định tính chất Append-only 100%: không có phương thức update hay delete log",
  );

  // TC-9: Ghi Activity Log khi gán (assign) và gỡ (unassign) Task
  console.log(
    "--- Test Case 9: Tương thích luồng Assign & Unassign Task hiện hữu ---",
  );
  const loggedActions: any[] = [];
  const mockTasksPrisma = {
    task: {
      findFirst: async () => ({
        id: taskId,
        projectId,
        deletedAt: null,
      }),
    },
    projectMember: {
      findUnique: async ({ where }: any) => {
        if (where.projectId_userId?.userId === actorId) {
          return { projectId, userId: actorId, role: ProjectRole.MEMBER };
        }
        if (where.projectId_userId?.userId === targetUserId) {
          return { projectId, userId: targetUserId, role: ProjectRole.MEMBER };
        }
        return null;
      },
    },
    taskAssignment: {
      findUnique: async () => null,
      create: async ({ data }: any) => ({ id: "assign-1", ...data }),
      delete: async () => ({ id: "assign-1" }),
    },
    activityLog: {
      create: async ({ data }: any) => {
        loggedActions.push(data);
        return { id: "log-task", ...data };
      },
    },
    $transaction: async (callback: any) => {
      return callback(mockTasksPrisma);
    },
  } as unknown as PrismaService;

  const tasksService = new TasksService(mockTasksPrisma);

  // Assign task
  await tasksService.assign(taskId, actorId, targetUserId);
  assert.strictEqual(loggedActions.length, 1);
  assert.strictEqual(loggedActions[0].action, ActivityAction.TASK_ASSIGNED);
  assert.strictEqual(loggedActions[0].projectId, projectId);
  assert.strictEqual(loggedActions[0].actorId, actorId);
  assert.strictEqual(loggedActions[0].entityType, "TASK");
  assert.deepStrictEqual(loggedActions[0].metadata, {
    assignedUserId: targetUserId,
  });
  console.log("✅ TC-9a: Gán task tự động ghi log TASK_ASSIGNED kèm metadata");

  // Unassign task
  (mockTasksPrisma.taskAssignment.findUnique as any) = async () => ({
    id: "assign-1",
    taskId,
    userId: targetUserId,
  });

  await tasksService.unassign(taskId, actorId, targetUserId);
  assert.strictEqual(loggedActions.length, 2);
  assert.strictEqual(loggedActions[1].action, ActivityAction.TASK_UNASSIGNED);
  assert.strictEqual(loggedActions[1].projectId, projectId);
  assert.strictEqual(loggedActions[1].actorId, actorId);
  assert.strictEqual(loggedActions[1].entityType, "TASK");
  assert.deepStrictEqual(loggedActions[1].metadata, {
    unassignedUserId: targetUserId,
  });
  console.log(
    "✅ TC-9b: Gỡ gán task tự động ghi log TASK_UNASSIGNED kèm metadata",
  );

  console.log(
    "\n🎉 TOÀN BỘ 9/9 TEST CASES CHO TASK 20 ĐÃ PASS THÀNH CÔNG 100%!\n",
  );
}

void runTests();
