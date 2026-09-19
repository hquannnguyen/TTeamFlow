/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import assert from "node:assert";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ProjectRole, ProjectStatus } from "@prisma/client";
import { TasksService } from "../src/modules/tasks/tasks.service";

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử Task Move (Task 17)...\n");

  // 1. Move to completed column
  {
    const fakeTask = {
      id: "task-1",
      projectId: "proj-1",
      columnId: "col-todo",
      position: 1000,
      completedAt: null,
      deletedAt: null,
      column: { id: "col-todo", isCompleted: false },
      project: { id: "proj-1", status: ProjectStatus.ACTIVE },
    };

    const fakeTargetColumn = {
      id: "col-done",
      projectId: "proj-1",
      isCompleted: true,
    };

    let txTaskUpdateData: any = null;
    let txActivityLogData: any = null;

    const mockPrisma: any = {
      task: {
        findFirst: async () => fakeTask,
      },
      projectMember: {
        findUnique: async () => ({ role: ProjectRole.MEMBER }),
      },
      kanbanColumn: {
        findFirst: async () => fakeTargetColumn,
      },
      $transaction: async (cb: any) => {
        const fakeTx = {
          task: {
            update: async (args: any) => {
              txTaskUpdateData = args.data;
              return {
                ...fakeTask,
                ...args.data,
                column: fakeTargetColumn,
                assignments: [],
              };
            },
            findMany: async () => [{ id: "task-1", position: 1000 }],
          },
          activityLog: {
            create: async (args: any) => {
              txActivityLogData = args.data;
              return args.data;
            },
          },
        };
        return cb(fakeTx);
      },
    };

    const service = new TasksService(mockPrisma);
    const result = await service.move("task-1", "user-1", {
      targetColumnId: "col-done",
      newPosition: 1500,
    });

    assert.strictEqual(result.columnId, "col-done");
    assert.ok(txTaskUpdateData.completedAt instanceof Date);
    assert.strictEqual(txActivityLogData.action, "TASK_COMPLETED");
    console.log(
      "✔ Test 1: Move sang cột completed -> completedAt được gán đúng ngày",
    );
  }

  // 2. Move from completed column to in-progress column
  {
    const fakeTask = {
      id: "task-2",
      projectId: "proj-1",
      columnId: "col-done",
      position: 2000,
      completedAt: new Date(),
      deletedAt: null,
      column: { id: "col-done", isCompleted: true },
      project: { id: "proj-1", status: ProjectStatus.ACTIVE },
    };

    const fakeTargetColumn = {
      id: "col-doing",
      projectId: "proj-1",
      isCompleted: false,
    };

    let txTaskUpdateData: any = null;
    let txActivityLogData: any = null;

    const mockPrisma: any = {
      task: {
        findFirst: async () => fakeTask,
      },
      projectMember: {
        findUnique: async () => ({ role: ProjectRole.MEMBER }),
      },
      kanbanColumn: {
        findFirst: async () => fakeTargetColumn,
      },
      $transaction: async (cb: any) => {
        const fakeTx = {
          task: {
            update: async (args: any) => {
              txTaskUpdateData = args.data;
              return { ...fakeTask, ...args.data };
            },
            findMany: async () => [{ id: "task-2", position: 1000 }],
          },
          activityLog: {
            create: async (args: any) => {
              txActivityLogData = args.data;
            },
          },
        };
        return cb(fakeTx);
      },
    };

    const service = new TasksService(mockPrisma);
    await service.move("task-2", "user-1", {
      targetColumnId: "col-doing",
      newPosition: 1000,
    });

    assert.strictEqual(txTaskUpdateData.completedAt, null);
    assert.strictEqual(txActivityLogData.action, "TASK_MOVED");
    console.log("✔ Test 2: Move từ completed về doing -> completedAt = null");
  }

  // 3. Reject VIEWER role
  {
    const fakeTask = {
      id: "task-3",
      projectId: "proj-1",
      columnId: "col-todo",
      deletedAt: null,
      column: { id: "col-todo", isCompleted: false },
      project: { id: "proj-1", status: ProjectStatus.ACTIVE },
    };

    const mockPrisma: any = {
      task: { findFirst: async () => fakeTask },
      projectMember: { findUnique: async () => ({ role: ProjectRole.VIEWER }) },
    };

    const service = new TasksService(mockPrisma);
    await assert.rejects(
      () =>
        service.move("task-3", "viewer-user", {
          targetColumnId: "col-doing",
          newPosition: 1000,
        }),
      ForbiddenException,
    );
    console.log("✔ Test 3: Chặn role VIEWER di chuyển task");
  }

  // 4. Reject ARCHIVED project
  {
    const fakeTask = {
      id: "task-4",
      projectId: "proj-1",
      columnId: "col-todo",
      deletedAt: null,
      column: { id: "col-todo", isCompleted: false },
      project: { id: "proj-1", status: ProjectStatus.ARCHIVED },
    };

    const mockPrisma: any = {
      task: { findFirst: async () => fakeTask },
    };

    const service = new TasksService(mockPrisma);
    await assert.rejects(
      () =>
        service.move("task-4", "user-1", {
          targetColumnId: "col-doing",
          newPosition: 1000,
        }),
      BadRequestException,
    );
    console.log("✔ Test 4: Chặn di chuyển task khi project bị ARCHIVED");
  }

  // 5. Reorder normalization when collision occurs
  {
    const fakeTask = {
      id: "task-1",
      projectId: "proj-1",
      columnId: "col-todo",
      position: 1000,
      completedAt: null,
      deletedAt: null,
      column: { id: "col-todo", isCompleted: false },
      project: { id: "proj-1", status: ProjectStatus.ACTIVE },
    };

    const fakeTargetColumn = {
      id: "col-todo",
      projectId: "proj-1",
      isCompleted: false,
    };

    const reorderedUpdates: Record<string, number> = {};

    const mockPrisma: any = {
      task: { findFirst: async () => fakeTask },
      projectMember: {
        findUnique: async () => ({ role: ProjectRole.MANAGER }),
      },
      kanbanColumn: { findFirst: async () => fakeTargetColumn },
      $transaction: async (cb: any) => {
        const fakeTx = {
          task: {
            update: async (args: any) => {
              reorderedUpdates[args.where.id] = args.data.position;
              return { ...fakeTask, ...args.data };
            },
            findMany: async () => [
              { id: "task-1", position: 1000 },
              { id: "task-2", position: 1000 },
            ],
          },
          activityLog: {
            create: async () => {},
          },
        };
        return cb(fakeTx);
      },
    };

    const service = new TasksService(mockPrisma);
    await service.move("task-1", "user-1", {
      targetColumnId: "col-todo",
      newPosition: 1000,
    });

    assert.strictEqual(reorderedUpdates["task-1"], 1000);
    assert.strictEqual(reorderedUpdates["task-2"], 2000);
    console.log("✔ Test 5: Tự động reorder chuẩn hóa position khi có va chạm");
  }

  console.log("\n🎉 Tất cả test Task Move (Task 17) đã thành công!\n");
}

void runTests();
