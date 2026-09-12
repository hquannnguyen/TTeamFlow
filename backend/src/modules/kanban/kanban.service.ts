import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KanbanService {
  constructor(private readonly prisma: PrismaService) { }

  async getKanbanBoard(projectId: string) {
    // 1. Kiểm tra dự án có tồn tại không (Early Return - Quy tắc 55)
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Dự án không tồn tại');
    }

    // 2. Truy xuất dữ liệu (Giữ nguyên logic include count từ code cũ, áp dụng Quy tắc 73)
    return this.prisma.kanbanColumn.findMany({
      where: { projectId },
      orderBy: { position: 'asc' }, // Sắp xếp cột theo position
      include: {
        tasks: {
          where: { deletedAt: null }, // Quy tắc 73: Áp dụng soft delete cho task
          orderBy: { position: 'asc' }, // Sắp xếp task theo position
          include: {
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    // Bổ sung email nếu cần hiển thị trên UI sau này
                    email: true,
                  },
                },
              },
            },
            // Giữ lại phần lấy số đếm từ code cũ để phục vụ render UI TaskCard
            _count: {
              select: { checklistItems: true, comments: true },
            },
          },
        },
      },
    });
  }
}