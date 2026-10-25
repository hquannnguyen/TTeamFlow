import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import * as path from "path";
import * as fs from "fs";

const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** So khớp những byte đầu file với định dạng ảnh được khai báo. */
function matchesImageSignature(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length < 12) return false;
  switch (mimetype) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/gif":
      return ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6));
    case "image/webp":
      return (
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      );
    default:
      return false;
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        phone: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) throw new NotFoundException("Không tìm thấy người dùng");
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Không tìm thấy người dùng");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        phone: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
      },
    });

    return updated;
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException("Không có file nào được tải lên");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF)",
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException("Kích thước file tối đa là 5MB");
    }

    // Không tin tên file/đuôi do client gửi: kiểm tra chữ ký thật của file
    const ext = AVATAR_EXTENSIONS[file.mimetype];
    if (!ext || !matchesImageSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException("Nội dung file không phải ảnh hợp lệ");
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "uploads", "avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${userId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    fs.writeFileSync(filepath, file.buffer);

    // Delete old avatar if it exists and is a local file
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (existing?.avatarUrl?.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(process.cwd(), existing.avatarUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const avatarUrl = `/uploads/avatars/${filename}`;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        phone: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
      },
    });

    return updated;
  }

  async search(q?: string, projectId?: string, currentUserId?: string) {
    const keyword = (q || "").trim();
    if (!keyword) {
      return [];
    }

    let existingMemberIds = new Set<string>();
    if (projectId) {
      const members = await this.prisma.projectMember.findMany({
        where: { projectId },
        select: { userId: true },
      });
      existingMemberIds = new Set(members.map((m) => m.userId));
    }

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { email: { contains: keyword, mode: "insensitive" } },
          { fullName: { contains: keyword, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
      },
      take: 10,
    });

    return users.map((u) => ({
      ...u,
      isMember: existingMemberIds.has(u.id),
      isSelf: u.id === currentUserId,
    }));
  }
}
