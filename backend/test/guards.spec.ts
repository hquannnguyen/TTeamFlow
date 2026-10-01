import assert from "node:assert";
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ProjectRole, SystemRole } from "@prisma/client";
import { SystemRoleGuard } from "../src/common/guards/system-role.guard";
import { ProjectRoleGuard } from "../src/common/guards/project-role.guard";
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
  console.log("🚀 Bắt đầu kiểm thử RBAC Guards...\n");
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

  console.log(
    "\n🎉 TOÀN BỘ 13/13 TEST CASES KIỂM THỬ RBAC GUARDS ĐÃ PASS THÀNH CÔNG 100%!",
  );
}

runTests().catch((err: unknown) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
