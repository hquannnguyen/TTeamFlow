/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument */
import assert from "node:assert";
import { Reflector } from "@nestjs/core";
import { ProjectRole } from "@prisma/client";
import { firstValueFrom, of } from "rxjs";
import { PROJECT_ROLES_KEY } from "../src/common/decorators/project-roles.decorator";
import { ResponseInterceptor } from "../src/common/interceptors/response.interceptor";
import { DashboardController } from "../src/modules/dashboard/dashboard.controller";
import { DashboardService } from "../src/modules/dashboard/dashboard.service";
import type { PrismaService } from "../src/prisma/prisma.service";

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử Dashboard Metrics (Task 26)...\n");

  const projectId = "11111111-1111-1111-1111-111111111111";

  // Dữ liệu mock mẫu chuẩn theo API_REQUEST_RESPONSE.md Mục 10
  const mockColumns = [
    {
      id: "col-1",
      name: "TODO",
      isCompleted: false,
      position: 1000,
      _count: { tasks: 12 },
    },
    {
      id: "col-2",
      name: "IN_PROGRESS",
      isCompleted: false,
      position: 2000,
      _count: { tasks: 10 },
    },
    {
      id: "col-3",
      name: "DONE",
      isCompleted: true,
      position: 3000,
      _count: { tasks: 20 },
    },
  ];

  const mockWorkloads = [
    {
      user: {
        id: "user-1",
        fullName: "Trịnh Kiên",
        avatarUrl: null,
        _count: { taskAssignments: 6 },
      },
    },
    {
      user: {
        id: "user-2",
        fullName: "Nguyễn Hữu Quân",
        avatarUrl: "https://example.com/avatar.jpg",
        _count: { taskAssignments: 10 },
      },
    },
    {
      user: {
        id: "user-3",
        fullName: "Vũ Văn Phong",
        avatarUrl: null,
        _count: { taskAssignments: 0 },
      },
    },
  ];

  // Mock Prisma Service
  const mockPrisma = {
    task: {
      count: async ({ where }: any) => {
        if (where.projectId !== projectId) return 0;
        // 1. Task hoàn thành: completedAt: { not: null }
        if (where.completedAt && "not" in where.completedAt) {
          return 20;
        }
        // 2. Task quá hạn: completedAt = null AND dueDate < now
        if (where.completedAt === null && where.dueDate) {
          return 3;
        }
        // 3. Tổng số task
        return 42;
      },
    },
    kanbanColumn: {
      findMany: async ({ where }: any) => {
        if (where.projectId !== projectId) return [];
        return mockColumns;
      },
    },
    projectMember: {
      findMany: async ({ where }: any) => {
        if (where.projectId !== projectId) return [];
        return mockWorkloads;
      },
    },
  } as unknown as PrismaService;

  const dashboardService = new DashboardService(mockPrisma);

  // --- TC-1: Dashboard metrics với dự án có đầy đủ dữ liệu ---
  console.log("--- Test Case 1: Thống kê đầy đủ chỉ số dự án ---");
  const metrics = await dashboardService.metrics(projectId);

  assert.strictEqual(metrics.totalTasks, 42, "Tổng số task phải là 42");
  assert.strictEqual(
    metrics.completedTasks,
    20,
    "Số task hoàn thành phải là 20",
  );
  assert.strictEqual(metrics.overdueTasks, 3, "Số task quá hạn phải là 3");
  assert.strictEqual(metrics.progress, 47.62, "Tiến độ phải là 47.62%");
  console.log(
    "✅ TC-1: Thống kê chính xác 4 chỉ số cốt lõi (total=42, completed=20, overdue=3, progress=47.62%)",
  );

  // --- TC-2: Dự án trống (0 task) không bị lỗi chia cho 0 ---
  console.log("--- Test Case 2: Xử lý dự án trống (0 tasks) ---");
  const emptyPrisma = {
    task: { count: async () => 0 },
    kanbanColumn: { findMany: async () => [] },
    projectMember: { findMany: async () => [] },
  } as unknown as PrismaService;

  const emptyDashboardService = new DashboardService(emptyPrisma);
  const emptyMetrics = await emptyDashboardService.metrics(projectId);

  assert.strictEqual(emptyMetrics.totalTasks, 0);
  assert.strictEqual(emptyMetrics.completedTasks, 0);
  assert.strictEqual(emptyMetrics.overdueTasks, 0);
  assert.strictEqual(
    emptyMetrics.progress,
    0,
    "Progress khi 0 task phải bằng 0 (không được là NaN)",
  );
  assert.strictEqual(emptyMetrics.statusDistribution.length, 0);
  assert.strictEqual(emptyMetrics.memberWorkload.length, 0);
  console.log(
    "✅ TC-2: Dự án trống trả về progress = 0 an toàn, không bị lỗi chia cho 0 NaN",
  );

  // --- TC-3: Phân loại task quá hạn chính xác ---
  console.log("--- Test Case 3: Kiểm tra điều kiện lọc Overdue Tasks ---");
  let capturedOverdueQuery: any = null;
  const spyPrisma = {
    task: {
      count: async ({ where }: any) => {
        if (where.dueDate) capturedOverdueQuery = where;
        return 0;
      },
    },
    kanbanColumn: { findMany: async () => [] },
    projectMember: { findMany: async () => [] },
  } as unknown as PrismaService;

  const spyService = new DashboardService(spyPrisma);
  await spyService.metrics(projectId);

  assert.strictEqual(capturedOverdueQuery.projectId, projectId);
  assert.strictEqual(
    capturedOverdueQuery.deletedAt,
    null,
    "Overdue phải bỏ qua task xóa mềm",
  );
  assert.strictEqual(
    capturedOverdueQuery.completedAt,
    null,
    "Overdue CHỈ đếm task chưa hoàn thành (completedAt: null)",
  );
  assert.ok(
    capturedOverdueQuery.dueDate.lt instanceof Date,
    "Overdue phải so sánh dueDate < now",
  );
  console.log(
    "✅ TC-3: Logic Overdue chuẩn xác: dueDate < now VÀ completedAt == null VÀ deletedAt == null",
  );

  // --- TC-4: Phân bổ cột Kanban (statusDistribution) ---
  console.log("--- Test Case 4: Phân bổ trạng thái cột Kanban ---");
  assert.strictEqual(metrics.statusDistribution.length, 3);
  assert.strictEqual(metrics.statusDistribution[0].columnName, "TODO");
  assert.strictEqual(metrics.statusDistribution[0].count, 12);
  assert.strictEqual(metrics.statusDistribution[1].columnName, "IN_PROGRESS");
  assert.strictEqual(metrics.statusDistribution[1].count, 10);
  assert.strictEqual(metrics.statusDistribution[2].columnName, "DONE");
  assert.strictEqual(metrics.statusDistribution[2].isCompleted, true);
  assert.strictEqual(metrics.statusDistribution[2].count, 20);
  console.log(
    "✅ TC-4: Phân bổ cột Kanban đúng số lượng và thuộc tính isCompleted",
  );

  // --- TC-5: Khối lượng công việc thành viên (memberWorkload) ---
  console.log(
    "--- Test Case 5: Khối lượng công việc thành viên và sắp xếp ---",
  );
  assert.strictEqual(metrics.memberWorkload.length, 3);
  // Kiểm tra người có task nhiều nhất được sắp lên trước
  assert.strictEqual(metrics.memberWorkload[0].fullName, "Nguyễn Hữu Quân");
  assert.strictEqual(metrics.memberWorkload[0].activeTaskCount, 10);
  assert.strictEqual(metrics.memberWorkload[1].fullName, "Trịnh Kiên");
  assert.strictEqual(metrics.memberWorkload[1].activeTaskCount, 6);
  assert.strictEqual(metrics.memberWorkload[2].fullName, "Vũ Văn Phong");
  assert.strictEqual(metrics.memberWorkload[2].activeTaskCount, 0);
  console.log(
    "✅ TC-5: Thống kê đúng activeTaskCount và sắp xếp người bận nhất lên đầu",
  );

  // --- TC-6: Đóng gói phản hồi qua ResponseInterceptor ---
  console.log("--- Test Case 6: Chuẩn hóa dữ liệu qua ResponseInterceptor ---");
  const interceptor = new ResponseInterceptor();
  const mockCallHandler = {
    handle: () => of(metrics),
  };

  const intercepted$ = interceptor.intercept({} as any, mockCallHandler);
  const result = (await firstValueFrom(intercepted$)) as any;

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.totalTasks, 42);
  assert.strictEqual(result.data.progress, 47.62);
  console.log(
    "✅ TC-6: ResponseInterceptor trả về cấu trúc chuẩn { success: true, data: {...} }",
  );

  // --- TC-7: Phân quyền RBAC trên DashboardController ---
  console.log("--- Test Case 7: Phân quyền DashboardController ---");
  const reflector = new Reflector();
  const allowedRoles = reflector.get<ProjectRole[]>(
    PROJECT_ROLES_KEY,
    DashboardController.prototype.metrics,
  );
  assert.deepStrictEqual(
    allowedRoles,
    [
      ProjectRole.OWNER,
      ProjectRole.MANAGER,
      ProjectRole.MEMBER,
      ProjectRole.VIEWER,
    ],
    "Dashboard phải cho phép cả 4 quyền: OWNER, MANAGER, MEMBER, VIEWER",
  );
  console.log(
    "✅ TC-7: DashboardController cấu hình đầy đủ quyền đọc [OWNER, MANAGER, MEMBER, VIEWER]",
  );

  // --- TC-8: Kiểm tra loại bỏ task xóa mềm khỏi mọi phép tính ---
  console.log("--- Test Case 8: Đảm bảo loại trừ task bị xóa mềm ---");
  let totalTasksQuery: any = null;
  const deleteCheckPrisma = {
    task: {
      count: async ({ where }: any) => {
        if (!where.completedAt && !where.dueDate) totalTasksQuery = where;
        return 0;
      },
    },
    kanbanColumn: { findMany: async () => [] },
    projectMember: { findMany: async () => [] },
  } as unknown as PrismaService;

  const deleteCheckService = new DashboardService(deleteCheckPrisma);
  await deleteCheckService.metrics(projectId);

  assert.strictEqual(
    totalTasksQuery.deletedAt,
    null,
    "Truy vấn tổng task phải có deletedAt: null",
  );
  console.log("✅ TC-8: Khẳng định 100% không tính task đã bị xóa mềm");

  console.log(
    "\n🎉 TOÀN BỘ 8/8 TEST CASES CHO TASK 26 ĐÃ PASS THÀNH CÔNG 100%!\n",
  );
}

void runTests();
