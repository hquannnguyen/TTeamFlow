/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import assert from "node:assert";
import { BadRequestException } from "@nestjs/common";
import { ActionTokenPurpose } from "@prisma/client";
import { AuthService } from "../src/modules/auth/auth.service";

function makeConfig(): any {
  return {
    getOrThrow: (key: string) => `secret-${key}`,
    get: () => "15m",
  };
}

function makeMail() {
  return {
    sendVerificationEmail: async () => true,
    sendPasswordResetEmail: async () => true,
  };
}

async function runTests() {
  console.log("🚀 Bắt đầu kiểm thử Forgot/Reset password & Verify email...\n");

  // 1. forgotPassword với email KHÔNG tồn tại: vẫn trả message chung, không gửi mail
  {
    let mailSent = false;
    const mockPrisma: any = {
      user: { findUnique: async () => null },
      actionToken: {
        deleteMany: async () => ({}),
        create: async () => {
          throw new Error("không được tạo token cho email lạ");
        },
      },
      $transaction: async () => ({}),
    };
    const service = new AuthService(mockPrisma, {} as any, makeConfig(), {
      sendPasswordResetEmail: async () => {
        mailSent = true;
        return true;
      },
    } as any);

    const result = await service.forgotPassword({
      email: "khongton tai@example.com",
    });
    assert.ok(result.message.includes("Nếu email tồn tại"));
    assert.strictEqual(mailSent, false);
    console.log(
      "✔ Test 1: forgot-password trả message chung, không gửi mail cho email lạ",
    );
  }

  // 2. forgotPassword với email tồn tại: tạo token + gửi mail
  {
    let createdPurpose = "";
    let sentTo = "";
    const mockPrisma: any = {
      user: {
        findUnique: async () => ({
          id: "user-1",
          fullName: "Nguyen Van A",
          email: "a@example.com",
          isActive: true,
        }),
      },
      actionToken: {
        deleteMany: async () => ({}),
        create: async (args: any) => {
          createdPurpose = args.data.purpose;
          return { id: "tok-1", ...args.data };
        },
      },
      $transaction: async (ops: any[]) => Promise.all(ops),
    };
    const service = new AuthService(mockPrisma, {} as any, makeConfig(), {
      sendPasswordResetEmail: async (to: string) => {
        sentTo = to;
        return true;
      },
    } as any);

    const result = await service.forgotPassword({ email: "a@example.com" });
    assert.strictEqual(createdPurpose, ActionTokenPurpose.PASSWORD_RESET);
    assert.strictEqual(sentTo, "a@example.com");
    assert.ok(result.message.includes("Nếu email tồn tại"));
    console.log(
      "✔ Test 2: forgot-password tạo token PASSWORD_RESET và gửi email",
    );
  }

  // 3. resetPassword token sai -> 400
  {
    const mockPrisma: any = {
      actionToken: { findUnique: async () => null },
    };
    const service = new AuthService(
      mockPrisma,
      {} as any,
      makeConfig(),
      makeMail() as any,
    );
    await assert.rejects(
      () =>
        service.resetPassword({
          token: "token-sai",
          newPassword: "NewPass@123",
        }),
      BadRequestException,
    );
    console.log("✔ Test 3: reset-password từ chối token không tồn tại");
  }

  // 4. resetPassword token đã dùng -> 400
  {
    const mockPrisma: any = {
      actionToken: {
        findUnique: async () => ({
          id: "tok-1",
          userId: "user-1",
          purpose: ActionTokenPurpose.PASSWORD_RESET,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
        }),
      },
    };
    const service = new AuthService(
      mockPrisma,
      {} as any,
      makeConfig(),
      makeMail() as any,
    );
    await assert.rejects(
      () =>
        service.resetPassword({ token: "da-dung", newPassword: "NewPass@123" }),
      BadRequestException,
    );
    console.log("✔ Test 4: reset-password từ chối token đã dùng");
  }

  // 5. resetPassword token hết hạn -> 400
  {
    const mockPrisma: any = {
      actionToken: {
        findUnique: async () => ({
          id: "tok-1",
          userId: "user-1",
          purpose: ActionTokenPurpose.PASSWORD_RESET,
          usedAt: null,
          expiresAt: new Date(Date.now() - 60_000),
        }),
      },
    };
    const service = new AuthService(
      mockPrisma,
      {} as any,
      makeConfig(),
      makeMail() as any,
    );
    await assert.rejects(
      () =>
        service.resetPassword({ token: "het-han", newPassword: "NewPass@123" }),
      BadRequestException,
    );
    console.log("✔ Test 5: reset-password từ chối token hết hạn");
  }

  // 6. resetPassword thành công: đổi password + revoke mọi refresh token + token dùng 1 lần
  {
    let revoked = false;
    let tokenUsed = false;
    const mockPrisma: any = {
      actionToken: {
        findUnique: async () => ({
          id: "tok-1",
          userId: "user-1",
          purpose: ActionTokenPurpose.PASSWORD_RESET,
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        }),
        update: async () => {
          tokenUsed = true;
          return {};
        },
      },
      user: {
        findUnique: async () => ({
          id: "user-1",
          passwordHash: "$2b$10$oldhash",
        }),
        update: async () => ({}),
      },
      refreshToken: {
        updateMany: async () => {
          revoked = true;
          return {};
        },
      },
      $transaction: async (ops: any[]) => Promise.all(ops),
    };
    const service = new AuthService(
      mockPrisma,
      {} as any,
      makeConfig(),
      makeMail() as any,
    );
    const result = await service.resetPassword({
      token: "token-hop-le",
      newPassword: "NewPass@123",
    });
    assert.ok(result.message.includes("Đặt lại mật khẩu thành công"));
    assert.strictEqual(revoked, true);
    assert.strictEqual(tokenUsed, true);
    console.log(
      "✔ Test 6: reset-password thành công, thu hồi phiên + token 1 lần",
    );
  }

  // 7. verifyEmail thành công: emailVerified = true
  {
    let verified = false;
    const mockPrisma: any = {
      actionToken: {
        findUnique: async () => ({
          id: "tok-2",
          userId: "user-1",
          purpose: ActionTokenPurpose.EMAIL_VERIFY,
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        }),
        update: async () => ({}),
      },
      user: {
        update: async () => {
          verified = true;
          return {};
        },
      },
      $transaction: async (ops: any[]) => Promise.all(ops),
    };
    const service = new AuthService(
      mockPrisma,
      {} as any,
      makeConfig(),
      makeMail() as any,
    );
    const result = await service.verifyEmail("token-xac-minh");
    assert.ok(result.message.includes("Xác minh email thành công"));
    assert.strictEqual(verified, true);
    console.log("✔ Test 7: verify-email đặt emailVerified = true");
  }

  console.log("\n✅ Tất cả ca kiểm thử Email-Auth đều đạt!");
}

runTests().catch((error) => {
  console.error("❌ Kiểm thử thất bại:", error);
  process.exit(1);
});
