import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import type { StringValue } from "ms";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

    return user;
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác");
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

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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
}
