import assert from "node:assert";
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectRole, ProjectStatus, SystemRole } from "@prisma/client";
import { SystemRoleGuard } from "../src/common/guards/system-role.guard";
import { ProjectRoleGuard } from "../src/common/guards/project-role.guard";
import { CommentsService } from "../src/modules/comments/comments.service";
import type { PrismaService } from "../src/prisma/prisma.service";

interface MockUser {
  id?: string;
  systemRole?: SystemRole;
  email?: string;
}

interface MockMembership {
  role: ProjectRole;
  project?: { deletedAt: Date | null };
}

function createMockContext(
  user?: MockUser,
  params: Record<string, string> = {},
): ExecutionContext {
  const request = { user, params };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

async function runTests() {
  console.log(
    "🚀 Bắt đầu kiểm thử RBAC Guards & Permission Matrix (Task 33)...\n",
  );
  const reflector = new Reflector();

  // =========================================================================
  // 1. KIỂM THỬ SYSTEM ROLE GUARD
  // =========================================================================
  console.log("--- 1. Kiểm thử SystemRoleGuard ---");
  const systemGuard = new SystemRoleGuard(reflector);

  // TC-S1: Không có decorator @SystemRoles -> Cho phép đi qua
  reflector.getAllAndOverride = () => undefined;
  assert.strictEqual(
    systemGuard.canActivate(createMockContext({ systemRole: SystemRole.USER })),
    true,
    "TC-S1 Failed: Route không có decorator phải cho qua",
  );
  console.log(
    "✅ TC-S1: Route không có decorator @SystemRoles -> Cho phép đi qua",
  );

  // TC-S2: Chưa đăng nhập (không có request.user) -> Bắn lỗi 401 Unauthorized
  reflector.getAllAndOverride = () => [SystemRole.ADMIN];
  assert.throws(
    () => systemGuard.canActivate(createMockContext(undefined)),
    (err: unknown) =>
      err instanceof UnauthorizedException && err.getStatus() === 401,
    "TC-S2 Failed: Chưa đăng nhập phải ném 401",
  );
  console.log(
    "✅ TC-S2: Chưa đăng nhập vào route yêu cầu SystemRole -> Trả về 401 Unauthorized",
  );

  // TC-S3: User thường (USER) cố truy cập route ADMIN -> Bắn lỗi 403 Forbidden
  assert.throws(
    () =>
      systemGuard.canActivate(
        createMockContext({ systemRole: SystemRole.USER }),
      ),
    (err: unknown) =>
      err instanceof ForbiddenException && err.getStatus() === 403,
    "TC-S3 Failed: Sai role phải ném 403",
  );
  console.log(
    "✅ TC-S3: User role USER gọi route ADMIN -> Trả về 403 Forbidden",
  );

  // TC-S4: Đúng role ADMIN -> Cho phép đi qua (true)
  assert.strictEqual(
    systemGuard.canActivate(
      createMockContext({ systemRole: SystemRole.ADMIN }),
    ),
    true,
    "TC-S4 Failed: Đúng role ADMIN phải cho qua",
  );
  console.log("✅ TC-S4: Đúng role ADMIN -> Cho phép đi qua");

  // =========================================================================
  // 2. KIỂM THỬ PROJECT ROLE GUARD
  // =========================================================================
  console.log("\n--- 2. Kiểm thử ProjectRoleGuard ---");
  let mockMembership: MockMembership | null = null;
  const mockPrisma = {
    projectMember: {
      findUnique: () => Promise.resolve(mockMembership),
    },
    project: {
      findUnique: () => Promise.resolve({ deletedAt: null }),
    },
  } as unknown as PrismaService;

  const projectGuard = new ProjectRoleGuard(reflector, mockPrisma);

  // TC-P1: Không có decorator @ProjectRoles -> Cho phép đi qua
  reflector.getAllAndOverride = () => undefined;
  assert.strictEqual(
    await projectGuard.canActivate(
      createMockContext({ id: "user-1" }, { projectId: "p-1" }),
    ),
    true,
    "TC-P1 Failed: Route không có decorator phải cho qua",
  );
  console.log(
    "✅ TC-P1: Route không có decorator @ProjectRoles -> Cho phép đi qua",
  );

  // TC-P2: Chưa đăng nhập -> Trả về 401 Unauthorized
  reflector.getAllAndOverride = () => [ProjectRole.OWNER, ProjectRole.MANAGER];
  await assert.rejects(
    async () =>
      await projectGuard.canActivate(
        createMockContext(undefined, { projectId: "p-1" }),
      ),
    (err: unknown) =>
      err instanceof UnauthorizedException && err.getStatus() === 401,
    "TC-P2 Failed: Chưa đăng nhập phải ném 401",
  );
  console.log(
    "✅ TC-P2: Chưa đăng nhập vào route project -> Trả về 401 Unauthorized",
  );

  // TC-P3: Không tìm thấy projectId trong params -> Trả về 403 Forbidden
  await assert.rejects(
    async () =>
      await projectGuard.canActivate(createMockContext({ id: "user-1" }, {})),
    (err: unknown) =>
      err instanceof ForbiddenException && err.getStatus() === 403,
    "TC-P3 Failed: Không có projectId phải ném 403",
  );
  console.log("✅ TC-P3: Route thiếu projectId param -> Trả về 403 Forbidden");

  // TC-P4: Người ngoài (Không phải thành viên dự án) -> Trả về 403 Forbidden
  mockMembership = null;
  await assert.rejects(
    async () =>
      await projectGuard.canActivate(
        createMockContext({ id: "user-outsider" }, { projectId: "p-1" }),
      ),
    (err: unknown) =>
      err instanceof ForbiddenException && err.getStatus() === 403,
    "TC-P4 Failed: Người ngoài phải ném 403",
  );
  console.log(
    "✅ TC-P4: Người ngoài (không có membership) -> Trả về 403 Forbidden",
  );

  // TC-P5: Dự án đã bị xóa mềm (deletedAt != null) -> Trả về 403 Forbidden
  mockMembership = {
    role: ProjectRole.OWNER,
    project: { deletedAt: new Date() },
  };
  await assert.rejects(
    async () =>
      await projectGuard.canActivate(
        createMockContext({ id: "user-1" }, { projectId: "p-1" }),
      ),
    (err: unknown) =>
      err instanceof ForbiddenException && err.getStatus() === 403,
    "TC-P5 Failed: Project đã xóa mềm phải ném 403",
  );
  console.log(
    "✅ TC-P5: Dự án đã bị xóa mềm (deletedAt != null) -> Trả về 403 Forbidden",
  );

  // TC-P6: Role VIEWER cố thao tác route chỉ cho OWNER, MANAGER -> Trả về 403 Forbidden
  mockMembership = {
    role: ProjectRole.VIEWER,
    project: { deletedAt: null },
  };
  await assert.rejects(
    async () =>
      await projectGuard.canActivate(
        createMockContext({ id: "user-1" }, { projectId: "p-1" }),
      ),
    (err: unknown) =>
      err instanceof ForbiddenException && err.getStatus() === 403,
    "TC-P6 Failed: VIEWER không có quyền phải ném 403",
  );
  console.log(
    "✅ TC-P6: Role VIEWER gọi route yêu cầu [OWNER, MANAGER] -> Trả về 403 Forbidden",
  );

  // TC-P7: Đúng role OWNER -> Cho phép đi qua (true)
  mockMembership = {
    role: ProjectRole.OWNER,
    project: { deletedAt: null },
  };
  assert.strictEqual(
    await projectGuard.canActivate(
      createMockContext({ id: "user-1" }, { projectId: "p-1" }),
    ),
    true,
    "TC-P7 Failed: Đúng role OWNER phải cho qua",
  );
  console.log("✅ TC-P7: Đúng role OWNER -> Cho phép đi qua (true)");

  // TC-P8: Hỗ trợ cả param 'id' (tương thích ngược) -> Cho phép đi qua (true)
  assert.strictEqual(
    await projectGuard.canActivate(
      createMockContext({ id: "user-1" }, { id: "p-1" }),
    ),
    true,
    "TC-P8 Failed: Hỗ trợ param id",
  );
  console.log(
    "✅ TC-P8: Nhận diện linh hoạt params.projectId hoặc params.id -> Cho phép đi qua (true)",
  );

  // TC-P9: SystemRole ADMIN có quyền truy cập toàn hệ thống (kể cả không nằm trong membership)
  mockMembership = null; // Không có membership trong project
  assert.strictEqual(
    await projectGuard.canActivate(
      createMockContext(
        { id: "admin-user", systemRole: SystemRole.ADMIN },
        { projectId: "p-other-user" },
      ),
    ),
    true,
    "TC-P9 Failed: ADMIN phải truy cập được dự án của người khác",
  );
  console.log(
    "✅ TC-P9: SystemRole ADMIN truy cập dự án của người khác -> Cho phép đi qua (true)",
  );

  // =========================================================================
  // 3. KIỂM THỬ MA TRẬN PHÂN QUYỀN (RBAC PERMISSION MATRIX 401 / 403 / ALLOWED)
  // =========================================================================
  console.log(
    "\n--- 3. Kiểm thử RBAC Permission Matrix (401 / 403 / Allowed) ---",
  );

  // Helper kiểm thử từng tổ hợp trong ma trận
  async function assertProjectMatrix(
    requiredRoles: ProjectRole[],
    blockedRoles: ProjectRole[],
    allowedRoles: ProjectRole[],
  ) {
    reflector.getAllAndOverride = () => requiredRoles;

    // 1) Unauthenticated -> 401
    await assert.rejects(
      async () =>
        await projectGuard.canActivate(
          createMockContext(undefined, { projectId: "p-1" }),
        ),
      (err: unknown) =>
        err instanceof UnauthorizedException && err.getStatus() === 401,
    );

    // 2) Outsider (không thuộc dự án) -> 403
    mockMembership = null;
    await assert.rejects(
      async () =>
        await projectGuard.canActivate(
          createMockContext(
            { id: "outsider", systemRole: SystemRole.USER },
            { projectId: "p-1" },
          ),
        ),
      (err: unknown) =>
        err instanceof ForbiddenException && err.getStatus() === 403,
    );

    // 3) Các role bị chặn -> 403
    for (const role of blockedRoles) {
      mockMembership = { role, project: { deletedAt: null } };
      await assert.rejects(
        async () =>
          await projectGuard.canActivate(
            createMockContext(
              { id: `user-${role}`, systemRole: SystemRole.USER },
              { projectId: "p-1" },
            ),
          ),
        (err: unknown) =>
          err instanceof ForbiddenException && err.getStatus() === 403,
        `Role ${role} lẽ ra phải bị chặn 403`,
      );
    }

    // 4) Các role được phép -> Allowed (true)
    for (const role of allowedRoles) {
      mockMembership = { role, project: { deletedAt: null } };
      const allowed = await projectGuard.canActivate(
        createMockContext(
          { id: `user-${role}`, systemRole: SystemRole.USER },
          { projectId: "p-1" },
        ),
      );
      assert.strictEqual(allowed, true, `Role ${role} lẽ ra phải được phép`);
    }

    // 5) SystemRole.ADMIN (dù không có trong projectMember) -> Allowed (true)
    mockMembership = null;
    const adminAllowed = await projectGuard.canActivate(
      createMockContext(
        { id: "sys-admin", systemRole: SystemRole.ADMIN },
        { projectId: "p-1" },
      ),
    );
    assert.strictEqual(adminAllowed, true, "SystemRole.ADMIN phải được phép");
  }

  // TC-M1: Tier 1 [OWNER] (Archive / Restore / Delete Project)
  await assertProjectMatrix(
    [ProjectRole.OWNER],
    [ProjectRole.VIEWER, ProjectRole.MEMBER, ProjectRole.MANAGER],
    [ProjectRole.OWNER],
  );
  console.log(
    "✅ TC-M1: Matrix [OWNER] (Archive/Restore/Delete Project) -> 401/403/Allowed chuẩn xác",
  );

  // TC-M2: Tier 2 [OWNER, MANAGER] (Update Project, Manage Members, Manage Columns)
  await assertProjectMatrix(
    [ProjectRole.OWNER, ProjectRole.MANAGER],
    [ProjectRole.VIEWER, ProjectRole.MEMBER],
    [ProjectRole.MANAGER, ProjectRole.OWNER],
  );
  console.log(
    "✅ TC-M2: Matrix [OWNER, MANAGER] (Update Project/Members/Columns) -> 401/403/Allowed chuẩn xác",
  );

  // TC-M3: Tier 3 [OWNER, MANAGER, MEMBER] (Create Task)
  await assertProjectMatrix(
    [ProjectRole.OWNER, ProjectRole.MANAGER, ProjectRole.MEMBER],
    [ProjectRole.VIEWER],
    [ProjectRole.MEMBER, ProjectRole.MANAGER, ProjectRole.OWNER],
  );
  console.log(
    "✅ TC-M3: Matrix [OWNER, MANAGER, MEMBER] (Create/Edit Task) -> 401/403/Allowed chuẩn xác",
  );

  // TC-M4: Tier 4 [OWNER, MANAGER, MEMBER, VIEWER] (View Project, Kanban, Dashboard, Activity)
  await assertProjectMatrix(
    [
      ProjectRole.OWNER,
      ProjectRole.MANAGER,
      ProjectRole.MEMBER,
      ProjectRole.VIEWER,
    ],
    [],
    [
      ProjectRole.VIEWER,
      ProjectRole.MEMBER,
      ProjectRole.MANAGER,
      ProjectRole.OWNER,
    ],
  );
  console.log(
    "✅ TC-M4: Matrix [OWNER, MANAGER, MEMBER, VIEWER] (Read Project/Board/Dashboard/Activity) -> 401/403/Allowed chuẩn xác",
  );

  // TC-M5: Service-level RBAC cho CommentsService.remove (Chủ comment hoặc SystemRole.ADMIN)
  const mockCommentPrisma = {
    comment: {
      findUnique: () =>
        Promise.resolve({
          id: "c-1",
          userId: "author-1",
          task: {
            deletedAt: null,
            project: { status: ProjectStatus.ACTIVE },
          },
        }),
      delete: () => Promise.resolve({ id: "c-1" }),
    },
  } as unknown as PrismaService;
  const commentsService = new CommentsService(mockCommentPrisma);

  // Người khác không phải ADMIN cố xóa comment -> 403 Forbidden
  await assert.rejects(
    async () =>
      await commentsService.remove("c-1", "other-user", SystemRole.USER),
    (err: unknown) =>
      err instanceof ForbiddenException && err.getStatus() === 403,
    "TC-M5 Failed: Người khác không được xóa comment",
  );

  // Chính chủ comment xóa -> Allowed
  const ownerDel = await commentsService.remove(
    "c-1",
    "author-1",
    SystemRole.USER,
  );
  assert.strictEqual(ownerDel.success, true);

  // SystemRole.ADMIN xóa comment của người khác -> Allowed
  const adminDel = await commentsService.remove(
    "c-1",
    "sys-admin",
    SystemRole.ADMIN,
  );
  assert.strictEqual(adminDel.success, true);
  console.log(
    "✅ TC-M5: Service-level RBAC (CommentsService.remove) -> 403 (Other) / Allowed (Author & ADMIN) chuẩn xác",
  );

  console.log(
    "\n🎉 TOÀN BỘ 18/18 TEST CASES KIỂM THỬ RBAC GUARDS & PERMISSION MATRIX ĐÃ PASS THÀNH CÔNG 100%!",
  );
}

runTests().catch((err: unknown) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
