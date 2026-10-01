/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method, @typescript-eslint/require-await */
import assert from "node:assert";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectRole } from "@prisma/client";
import { PROJECT_ROLES_KEY } from "../src/common/decorators/project-roles.decorator";
import { ActivityAction } from "../src/modules/activity-logs/constants/activity-action.constant";
import { ColumnsController } from "../src/modules/kanban/columns.controller";
import { KanbanService } from "../src/modules/kanban/kanban.service";
import type { PrismaService } from "../src/prisma/prisma.service";

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử Kanban Reorder Columns (Task 11)...\n");

  const projectId = "11111111-1111-1111-1111-111111111111";
  const actorId = "99999999-9999-9999-9999-999999999999";

  // Mock DB state
  const mockColumns = [
    { id: "col-1", projectId, name: "TODO", position: 1000 },
    { id: "col-2", projectId, name: "DOING", position: 2000 },
    { id: "col-3", projectId, name: "DONE", position: 3000 },
  ];

  const updateCalls: Array<{
    where: { id: string };
    data: { position: number };
  }> = [];
  const activityLogs: any[] = [];

  const mockPrisma = {
    project: {
      findFirst: async ({ where }: any) => {
        if (where.id === projectId && where.deletedAt === null) {
          return { id: projectId, name: "Test Project" };
        }
        return null;
      },
    },
    kanbanColumn: {
      findMany: async ({ where }: any) => {
        if (where.projectId === projectId) {
          return [...mockColumns];
        }
        return [];
      },
      update: async ({ where, data }: any) => {
        updateCalls.push({ where, data });
        const col = mockColumns.find((c) => c.id === where.id);
        if (col) col.position = data.position;
        return col;
      },
    },
    activityLog: {
      create: async ({ data }: any) => {
        activityLogs.push(data);
        return { id: "log-1", ...data };
      },
    },
    $transaction: async (callback: any) => {
      return callback({
        kanbanColumn: mockPrisma.kanbanColumn,
        activityLog: mockPrisma.activityLog,
      });
    },
  } as unknown as PrismaService;

  const kanbanService = new KanbanService(mockPrisma);

  // TC-1: Dự án không tồn tại -> Bắn NotFoundException
  console.log("--- Test Case 1: Dự án không tồn tại ---");
  await assert.rejects(
    async () => {
      await kanbanService.reorderColumns("invalid-project-id", actorId, {
        columns: [{ columnId: "col-1", position: 2000 }],
      });
    },
    NotFoundException,
    "TC-1 Failed: Phải ném NotFoundException khi dự án không tồn tại",
  );
  console.log("✅ TC-1: Dự án không tồn tại -> Trả về 404 NotFoundException");

  // TC-2: Trùng lặp ID trong payload -> Bắn BadRequestException
  console.log("--- Test Case 2: Trùng lặp ID trong payload ---");
  await assert.rejects(
    async () => {
      await kanbanService.reorderColumns(projectId, actorId, {
        columns: [
          { columnId: "col-1", position: 1000 },
          { columnId: "col-1", position: 2000 },
        ],
      });
    },
    BadRequestException,
    "TC-2 Failed: Phải ném BadRequestException khi có ID trùng lặp",
  );
  console.log("✅ TC-2: Trùng lặp columnId -> Trả về 400 BadRequestException");

  // TC-3: Trùng lặp position trong payload -> Bắn BadRequestException
  console.log("--- Test Case 3: Trùng lặp position trong payload ---");
  await assert.rejects(
    async () => {
      await kanbanService.reorderColumns(projectId, actorId, {
        columns: [
          { columnId: "col-1", position: 1500 },
          { columnId: "col-2", position: 1500 },
        ],
      });
    },
    BadRequestException,
    "TC-3 Failed: Phải ném BadRequestException khi có position trùng lặp",
  );
  console.log("✅ TC-3: Trùng lặp position -> Trả về 400 BadRequestException");

  // TC-4: Cột không thuộc dự án -> Bắn BadRequestException
  console.log("--- Test Case 4: Cột không thuộc dự án ---");
  await assert.rejects(
    async () => {
      await kanbanService.reorderColumns(projectId, actorId, {
        columns: [{ columnId: "col-unknown", position: 1500 }],
      });
    },
    BadRequestException,
    "TC-4 Failed: Phải ném BadRequestException khi cột không thuộc project",
  );
  console.log(
    "✅ TC-4: Cột lạ không thuộc project -> Trả về 400 BadRequestException",
  );

  // TC-5: Xung đột vị trí với cột không cập nhật -> Bắn BadRequestException
  console.log("--- Test Case 5: Xung đột position với cột không cập nhật ---");
  await assert.rejects(
    async () => {
      // col-3 có position 3000, cập nhật col-1 thành 3000 mà không cập nhật col-3
      await kanbanService.reorderColumns(projectId, actorId, {
        columns: [{ columnId: "col-1", position: 3000 }],
      });
    },
    BadRequestException,
    "TC-5 Failed: Phải ném BadRequestException khi trùng position với cột khác",
  );
  console.log(
    "✅ TC-5: Xung đột vị trí với cột hiện có -> Trả về 400 BadRequestException",
  );

  // TC-6: Hoán đổi vị trí thành công (Two-Pass Update)
  console.log(
    "--- Test Case 6: Hoán đổi vị trí thành công (Two-Pass Update) ---",
  );
  updateCalls.length = 0;
  activityLogs.length = 0;

  const result = await kanbanService.reorderColumns(projectId, actorId, {
    columns: [
      { columnId: "col-1", position: 2000 },
      { columnId: "col-2", position: 1000 },
    ],
  });

  assert.ok(Array.isArray(result), "Kết quả trả về phải là một mảng");

  // Kiểm tra Pass 1: vị trí âm
  const pass1Col1 = updateCalls.find(
    (u) => u.where.id === "col-1" && u.data.position < 0,
  );
  const pass1Col2 = updateCalls.find(
    (u) => u.where.id === "col-2" && u.data.position < 0,
  );
  assert.ok(pass1Col1, "Pass 1 phải set position âm cho col-1");
  assert.ok(pass1Col2, "Pass 1 phải set position âm cho col-2");
  assert.notStrictEqual(
    pass1Col1.data.position,
    pass1Col2.data.position,
    "Vị trí âm trong Pass 1 phải khác nhau",
  );

  // Kiểm tra Pass 2: vị trí mục tiêu
  const pass2Col1 = updateCalls.find(
    (u) => u.where.id === "col-1" && u.data.position === 2000,
  );
  const pass2Col2 = updateCalls.find(
    (u) => u.where.id === "col-2" && u.data.position === 1000,
  );
  assert.ok(pass2Col1, "Pass 2 phải set position 2000 cho col-1");
  assert.ok(pass2Col2, "Pass 2 phải set position 1000 cho col-2");
  console.log(
    "✅ TC-6: Two-Pass Update an toàn không xung đột @@unique([projectId, position])",
  );

  // TC-7: Kiểm tra Activity Log được tạo tự động
  console.log("--- Test Case 7: Kiểm tra Activity Log được tạo tự động ---");
  assert.strictEqual(activityLogs.length, 1, "Phải có đúng 1 activity log");
  assert.strictEqual(
    activityLogs[0].action,
    ActivityAction.COLUMN_REORDERED,
    "Action log phải là COLUMN_REORDERED",
  );
  assert.strictEqual(
    activityLogs[0].projectId,
    projectId,
    "projectId phải khớp",
  );
  assert.strictEqual(activityLogs[0].actorId, actorId, "actorId phải khớp");
  console.log("✅ TC-7: Activity Log COLUMN_REORDERED được ghi nhận chính xác");

  // TC-8: Kiểm tra phân quyền trên ColumnsController
  console.log("--- Test Case 8: Phân quyền ColumnsController ---");
  const reflector = new Reflector();
  const roles = reflector.get<ProjectRole[]>(
    PROJECT_ROLES_KEY,
    ColumnsController.prototype.reorder,
  );
  assert.deepStrictEqual(
    roles,
    [ProjectRole.OWNER, ProjectRole.MANAGER],
    "Endpoint reorder columns chỉ cho phép OWNER và MANAGER",
  );
  console.log(
    "✅ TC-8: ColumnsController được bảo vệ đúng quyền OWNER và MANAGER",
  );

  console.log(
    "\n🎉 TOÀN BỘ 8/8 TEST CASES CHO TASK 11 ĐÃ PASS THÀNH CÔNG 100%!",
  );
}

void runTests();
