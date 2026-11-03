import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ActionTokenPurpose } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../../common/mail/mail.service";
import * as bcrypt from "bcrypt";
import * as crypto from "node:crypto";
import type { StringValue } from "ms";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });

    if (exists) throw new ConflictException("Email đã được sử dụng");

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        passwordHash,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        systemRole: true,
        createdAt: true,
      },
    });

    // Gửi email xác minh (best-effort — lỗi mail không chặn đăng ký)
    try {
      const token = await this.createActionToken(
        user.id,
        ActionTokenPurpose.EMAIL_VERIFY,
        24 * 60 * 60 * 1000,
      );
      await this.mail.sendVerificationEmail(email, user.fullName, token);
    } catch (error) {
      console.error("[AuthService] Không gửi được email xác minh:", error);
    }

    return user;
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
      );
    }

    const tokens = await this.issueTokens(user.id, user.email);

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(tokens.refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        systemRole: user.systemRole,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string };

    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException(
        "Refresh token không hợp lệ hoặc đã hết hạn",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException(
        "Tài khoản đã bị khóa hoặc không còn tồn tại",
      );
    }

    const records = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    const matched = await Promise.any(
      records.map(async (record) =>
        (await bcrypt.compare(refreshToken, record.tokenHash))
          ? record
          : Promise.reject(new Error("no match")),
      ),
    ).catch(() => null);

    if (!matched) {
      throw new UnauthorizedException("Phiên đăng nhập đã hết hạn");
    }

    const tokens = await this.issueTokens(payload.sub, payload.email);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: matched.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: payload.sub,
          tokenHash: await bcrypt.hash(tokens.refreshToken, 10),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return tokens;
  }

  async logout(userId?: string, refreshToken?: string) {
    if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { message: "Đăng xuất thành công" };
    }

    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(
          refreshToken,
          {
            secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
          },
        );
        if (payload?.sub) {
          await this.prisma.refreshToken.updateMany({
            where: { userId: payload.sub, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      } catch {
        // Token might already be invalid or expired; continue silently
      }
    }

    return { message: "Đăng xuất thành công" };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Người dùng không tồn tại");

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException("Mật khẩu hiện tại không chính xác");
    }

    const isSame = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException(
        "Mật khẩu mới không được trùng với mật khẩu hiện tại",
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: now,
        },
      }),
      // Revoke all refresh tokens → buộc đăng nhập lại trên tất cả thiết bị
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { message: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." };
  }

  private async issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>(
        "JWT_ACCESS_EXPIRES_IN",
        "15m",
      ) as StringValue,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>(
        "JWT_REFRESH_EXPIRES_IN",
        "7d",
      ) as StringValue,
    });

    return { accessToken, refreshToken };
  }

  // ── Quên / đặt lại mật khẩu & xác minh email ────────────────────────────────

  /**
   * Tạo ActionToken: sinh token ngẫu nhiên, lưu SHA-256 hash, xoá token cũ cùng mục đích.
   * Trả về token gốc (chỉ xuất hiện trong email, không lưu DB).
   */
  private async createActionToken(
    userId: string,
    purpose: ActionTokenPurpose,
    ttlMs: number,
  ) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await this.prisma.$transaction([
      // Chỉ giữ tối đa 1 token sống cho mỗi mục đích
      this.prisma.actionToken.deleteMany({
        where: { userId, purpose, usedAt: null },
      }),
      this.prisma.actionToken.create({
        data: {
          userId,
          tokenHash,
          purpose,
          expiresAt: new Date(Date.now() + ttlMs),
        },
      }),
    ]);

    return token;
  }

  /**
   * Xác minh ActionToken: băm token gốc tra DB, kiểm purpose/hết hạn/đã dùng.
   * Trả về bản ghi + userId để caller xử lý tiếp (dùng một lần).
   */
  private async verifyActionToken(token: string, purpose: ActionTokenPurpose) {
    if (!token) throw new BadRequestException("Token không hợp lệ");

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await this.prisma.actionToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.purpose !== purpose ||
      record.usedAt !== null ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException(
        "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.",
      );
    }

    return record;
  }

  /**
   * Luôn trả về thông điệp chung chung — không tiết lộ email có tồn tại hay không (chống dò email).
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, fullName: true, email: true, isActive: true },
    });

    if (user && user.isActive) {
      const token = await this.createActionToken(
        user.id,
        ActionTokenPurpose.PASSWORD_RESET,
        30 * 60 * 1000,
      );
      await this.mail.sendPasswordResetEmail(user.email, user.fullName, token);
    }

    return {
      message:
        "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.",
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.verifyActionToken(
      dto.token,
      ActionTokenPurpose.PASSWORD_RESET,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new BadRequestException("Tài khoản không tồn tại");

    const isSame = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException(
        "Mật khẩu mới không được trùng với mật khẩu hiện tại",
      );
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash, passwordChangedAt: now },
      }),
      // Đặt lại mật khẩu ⇒ thu hồi mọi phiên đăng nhập đang có
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      // Token chỉ dùng một lần
      this.prisma.actionToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
    ]);

    return {
      message:
        "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
    };
  }

  async verifyEmail(token: string) {
    const record = await this.verifyActionToken(
      token,
      ActionTokenPurpose.EMAIL_VERIFY,
    );

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      this.prisma.actionToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
    ]);

    return { message: "Xác minh email thành công. Cảm ơn bạn!" };
  }

  /** Gửi lại email xác minh cho người dùng đang đăng nhập nhưng chưa xác minh */
  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Người dùng không tồn tại");
    }
    if (user.emailVerified) {
      throw new BadRequestException("Email của bạn đã được xác minh trước đó");
    }

    const token = await this.createActionToken(
      user.id,
      ActionTokenPurpose.EMAIL_VERIFY,
      24 * 60 * 60 * 1000,
    );
    await this.mail.sendVerificationEmail(user.email, user.fullName, token);

    return { message: "Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư." };
  }
}
