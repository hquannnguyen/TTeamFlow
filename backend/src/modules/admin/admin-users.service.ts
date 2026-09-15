import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryUsersDto } from "./dto/query-users.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc",
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          phone: true,
          systemRole: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projectMembers: true,
            createdTasks: true,
            taskAssignments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Người dùng không tồn tại");
    }

    return user;
  }

  async updateUserStatus(
    userId: string,
    currentAdminId: string,
    dto: UpdateUserStatusDto,
  ) {
    // 🛡️ Self-lock protection: Không cho phép Admin tự khóa tài khoản của chính mình
    if (userId === currentAdminId && !dto.isActive) {
      throw new BadRequestException(
        "Bạn không thể tự khóa tài khoản của chính mình",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Người dùng không tồn tại");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

