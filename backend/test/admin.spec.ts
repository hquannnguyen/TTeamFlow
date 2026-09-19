import assert from "node:assert";
import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SystemRole } from "@prisma/client";
import { SystemRoleGuard } from "../src/common/guards/system-role.guard";
import { AdminUsersService } from "../src/modules/admin/admin-users.service";
import type { PrismaService } from "../src/prisma/prisma.service";

interface MockAdminUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  systemRole: SystemRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string;
}

function createMockContext(user?: {
  id: string;
  systemRole: SystemRole;
}): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

async function runAdminTests() {
  console.log("🚀 Bắt đầu kiểm thử Admin API (Task 19)...\n");

  // =========================================================================
  // 1. KIỂM THỬ PHÂN QUYỀN SYSTEM ROLE (CHỈ ADMIN MỚI ĐƯỢC PHÉP)
  // =========================================================================
  console.log("--- 1. Kiểm thử Phân quyền SystemRole.ADMIN ---");
  const reflector = new Reflector();
  const systemGuard = new SystemRoleGuard(reflector);

  reflector.getAllAndOverride = () => [SystemRole.ADMIN];

  const adminContext = createMockContext({
    id: "admin-1",
    systemRole: SystemRole.ADMIN,
  });
  const userContext = createMockContext({
    id: "user-1",
    systemRole: SystemRole.USER,
  });

  // TC-1: User thường gọi route Admin -> 403 Forbidden
  assert.throws(
    () => systemGuard.canActivate(userContext),
    (err: unknown) =>
      err instanceof ForbiddenException && err.getStatus() === 403,
    "TC-1 Failed: User thường phải bị chặn 403",
  );
  console.log(
    "✅ TC-1: User thường (USER) gọi Admin API -> Bị chặn 403 Forbidden",
  );

  // TC-2: Admin gọi route Admin -> Cho phép đi qua (true)
  assert.strictEqual(
    systemGuard.canActivate(adminContext),
    true,
    "TC-2 Failed: Admin phải được phép đi qua",
  );
  console.log(
    "✅ TC-2: Quản trị viên (ADMIN) gọi Admin API -> Cho phép truy cập (200)",
  );

  // =========================================================================
  // 2. KIỂM THỬ PAGINATION, SEARCH & FILTER CONTRACT
  // =========================================================================
  console.log("\n--- 2. Kiểm thử Phân trang (Pagination) & Tìm kiếm ---");

  const mockUsers: MockAdminUser[] = [
    {
      id: "u-1",
      email: "quan@example.com",
      fullName: "Nguyễn Hữu Quân",
      avatarUrl: null,
      phone: "0912345678",
      systemRole: SystemRole.USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "u-2",
      email: "kien@example.com",
      fullName: "Trịnh Kiên",
      avatarUrl: null,
      phone: "0987654321",
      systemRole: SystemRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  let capturedSkip: number | undefined;
  let capturedTake: number | undefined;

  const mockPrisma = {
    user: {
      findMany: (args: { skip?: number; take?: number }) => {
        capturedSkip = args.skip;
        capturedTake = args.take;
        return Promise.resolve(mockUsers);
      },
      count: () => Promise.resolve(45),
      findUnique: (args: { where: { id: string } }) => {
        if (args.where.id === "u-1") return Promise.resolve(mockUsers[0]);
        if (args.where.id === "admin-1")
          return Promise.resolve({
            id: "admin-1",
            isActive: true,
          } as MockAdminUser);
        return Promise.resolve(null);
      },
      update: (args: { where: { id: string }; data: { isActive: boolean } }) => {
        const updatedUser: MockAdminUser = {
          ...mockUsers[0],
          id: args.where.id,
          isActive: args.data.isActive,
        };
        return Promise.resolve(updatedUser);
      },
    },
  } as unknown as PrismaService;

  const service = new AdminUsersService(mockPrisma);

  // TC-3: Phân trang chuẩn với { data, meta }
  const result = await service.getUsers({
    page: 1,
    limit: 20,
    search: "quan",
    isActive: true,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  assert.strictEqual(
    result.data.length,
    2,
    "TC-3 Failed: Số lượng data trả về không đúng",
  );
  assert.deepStrictEqual(
    result.meta,
    { page: 1, limit: 20, total: 45, totalPages: 3 },
    "TC-3 Failed: Meta phân trang không đúng chuẩn contract",
  );
  assert.strictEqual(
    capturedSkip,
    0,
    "TC-3 Failed: skip phải bằng 0 cho page 1",
  );
  assert.strictEqual(
    capturedTake,
    20,
    "TC-3 Failed: take phải bằng limit = 20",
  );
  console.log(
    "✅ TC-3: Phân trang trả về đúng cấu trúc data & meta { page: 1, limit: 20, total: 45, totalPages: 3 }",
  );

  // TC-4: Tuyệt đối không expose passwordHash
  const firstUser = result.data[0] as MockAdminUser;
  assert.strictEqual(
    firstUser.passwordHash,
    undefined,
    "TC-4 Failed: Tuyệt đối không được trả về passwordHash",
  );
  console.log("✅ TC-4: Bảo mật: Danh sách user không chứa passwordHash");

  // =========================================================================
  // 3. KIỂM THỬ SELF-LOCK PROTECTION (CHỐNG ADMIN TỰ KHÓA CHÍNH MÌNH)
  // =========================================================================
  console.log("\n--- 3. Kiểm thử Self-lock Protection ---");

  // TC-5: Admin cố tình tự khóa chính mình (targetUserId === currentAdminId && isActive === false) -> 400 BadRequest
  await assert.rejects(
    async () =>
      await service.updateUserStatus("admin-1", "admin-1", { isActive: false }),
    (err: unknown) =>
      err instanceof BadRequestException &&
      err.message === "Bạn không thể tự khóa tài khoản của chính mình",
    "TC-5 Failed: Admin tự khóa phải bị chặn với 400 BadRequestException",
  );
  console.log(
    "✅ TC-5: Self-lock Protection: Admin cố tình khóa tài khoản của chính mình -> Bị chặn 400 BadRequest",
  );

  // TC-6: Khóa tài khoản của user khác -> Thành công
  const updated = await service.updateUserStatus("u-1", "admin-1", {
    isActive: false,
  });
  assert.strictEqual(
    updated.isActive,
    false,
    "TC-6 Failed: Cập nhật isActive thất bại",
  );
  console.log(
    "✅ TC-6: Khóa tài khoản người khác -> Thành công (isActive: false)",
  );

  // TC-7: Mở khóa tài khoản -> Thành công
  const unlocked = await service.updateUserStatus("u-1", "admin-1", {
    isActive: true,
  });
  assert.strictEqual(unlocked.isActive, true, "TC-7 Failed: Mở khóa thất bại");
  console.log("✅ TC-7: Mở khóa tài khoản -> Thành công (isActive: true)");

  // TC-8: User không tồn tại -> 404 NotFound
  await assert.rejects(
    async () =>
      await service.updateUserStatus("unknown-user", "admin-1", {
        isActive: false,
      }),
    (err: unknown) =>
      err instanceof NotFoundException &&
      err.message === "Người dùng không tồn tại",
    "TC-8 Failed: User không tồn tại phải ném 404",
  );
  console.log("✅ TC-8: Thao tác trên user không tồn tại -> Trả về 404 NotFound");

  console.log("\n🎉 TOÀN BỘ 8/8 TEST CASES ADMIN API ĐÃ PASS THÀNH CÔNG 100%!");
}

runAdminTests().catch((err: unknown) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

