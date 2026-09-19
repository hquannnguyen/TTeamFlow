import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityAction } from "../activity-logs/constants/activity-action.constant";
import { CreateColumnDto } from "./dto/create-column.dto";
import { ReorderColumnsDto } from "./dto/reorder-columns.dto";
import { UpdateColumnDto } from "./dto/update-column.dto";

@Injectable()
export class KanbanService {
  constructor(private readonly prisma: PrismaService) {}

  async getKanbanBoard(projectId: string) {
    // 1. Kiểm tra dự án có tồn tại không (Early Return - Quy tắc 55)
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException("Dự án không tồn tại");
    }

    // 2. Truy xuất dữ liệu (Giữ nguyên logic include count từ code cũ, áp dụng Quy tắc 73)
    return this.prisma.kanbanColumn.findMany({
      where: { projectId },
      orderBy: { position: "asc" }, // Sắp xếp cột theo position
      include: {
        tasks: {
          where: { deletedAt: null }, // Quy tắc 73: Áp dụng soft delete cho task
          orderBy: { position: "asc" }, // Sắp xếp task theo position
          include: {
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
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

  async createColumn(projectId: string, actorId: string, dto: CreateColumnDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException("Dự án không tồn tại");
    }

    // Lấy position lớn nhất hiện tại trong project
    const maxCol = await this.prisma.kanbanColumn.findFirst({
      where: { projectId },
      orderBy: { position: "desc" },
    });
    const position = (maxCol?.position ?? 0) + 1000;

    const column = await this.prisma.kanbanColumn.create({
      data: {
        projectId,
        name: dto.name.trim(),
        position,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        projectId,
        actorId,
        action: ActivityAction.COLUMN_REORDERED,
        entityType: "KANBAN_COLUMN",
        entityId: column.id,
        metadata: { name: column.name, position: column.position },
      },
    });

    return column;
  }

  async updateColumn(
    projectId: string,
    columnId: string,
    dto: UpdateColumnDto,
  ) {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: columnId, projectId },
    });
    if (!column) {
      throw new NotFoundException("Cột không tồn tại hoặc không thuộc dự án");
    }

    return this.prisma.kanbanColumn.update({
      where: { id: columnId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isCompleted !== undefined
          ? { isCompleted: dto.isCompleted }
          : {}),
      },
    });
  }

  async deleteColumn(
    projectId: string,
    columnId: string,
    targetColumnId?: string,
  ) {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: columnId, projectId },
      include: {
        _count: {
          select: {
            tasks: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException("Cột không tồn tại hoặc không thuộc dự án");
    }

    const taskCount = column._count.tasks;

    if (taskCount > 0) {
      if (!targetColumnId || targetColumnId === columnId) {
        throw new BadRequestException(
          "Vui lòng di chuyển các công việc sang cột khác trước khi xóa",
        );
      }

      const targetCol = await this.prisma.kanbanColumn.findFirst({
        where: { id: targetColumnId, projectId },
      });
      if (!targetCol) {
        throw new NotFoundException(
          "Cột đích chuyển giao công việc không tồn tại",
        );
      }

      // Chuyển toàn bộ nhiệm vụ sang cột đích
      await this.prisma.task.updateMany({
        where: { columnId, deletedAt: null },
        data: { columnId: targetColumnId },
      });
    }

    // Xóa bản ghi cột
    await this.prisma.kanbanColumn.delete({
      where: { id: columnId },
    });

    return { message: "Xóa cột thành công" };
  }

  async reorderColumns(
    projectId: string,
    actorId: string,
    dto: ReorderColumnsDto,
  ) {
    // 1. Kiểm tra dự án có tồn tại và chưa bị soft-delete
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException("Dự án không tồn tại");
    }

    // 2. Chuẩn hóa dữ liệu items từ DTO (hỗ trợ cả columnId và id)
    const items = dto.columns.map((item) => {
      const id = item.columnId || item.id;
      if (!id) {
        throw new BadRequestException(
          "Mỗi phần tử phải chứa columnId hoặc id hợp lệ",
        );
      }
      return { id, position: item.position };
    });

    // 3. Kiểm tra trùng lặp ID trong payload
    const idSet = new Set<string>();
    for (const item of items) {
      if (idSet.has(item.id)) {
        throw new BadRequestException(
          `ID cột bị trùng lặp trong yêu cầu: ${item.id}`,
        );
      }
      idSet.add(item.id);
    }

    // 4. Kiểm tra trùng lặp position trong payload
    const posSet = new Set<number>();
    for (const item of items) {
      if (posSet.has(item.position)) {
        throw new BadRequestException(
          `Vị trí position bị trùng lặp trong yêu cầu: ${item.position}`,
        );
      }
      posSet.add(item.position);
    }

    // 5. Kiểm tra các cột trong DB thuộc về projectId
    const existingColumns = await this.prisma.kanbanColumn.findMany({
      where: { projectId },
    });
    const existingMap = new Map(existingColumns.map((col) => [col.id, col]));

    for (const item of items) {
      if (!existingMap.has(item.id)) {
        throw new BadRequestException(
          `Cột có ID ${item.id} không tồn tại hoặc không thuộc dự án`,
        );
      }
    }

    // 6. Kiểm tra xung đột position với các cột không nằm trong danh sách cập nhật
    const updatingIds = new Set(items.map((i) => i.id));
    const nonUpdatingColumns = existingColumns.filter(
      (col) => !updatingIds.has(col.id),
    );
    for (const col of nonUpdatingColumns) {
      if (posSet.has(col.position)) {
        throw new BadRequestException(
          `Vị trí ${col.position} đã được sử dụng bởi cột "${col.name}"`,
        );
      }
    }

    // 7. Thực hiện cập nhật hai bước (Two-Pass Update) trong $transaction để tránh vi phạm @@unique([projectId, position])
    return this.prisma.$transaction(async (tx) => {
      // Pass 1: Gán position tạm thời là số âm để giải phóng các vị trí dương
      for (let i = 0; i < items.length; i++) {
        await tx.kanbanColumn.update({
          where: { id: items[i].id },
          data: { position: -(i + 1) * 1000 },
        });
      }

      // Pass 2: Gán position chính thức theo yêu cầu
      for (const item of items) {
        await tx.kanbanColumn.update({
          where: { id: item.id },
          data: { position: item.position },
        });
      }

      // Ghi nhận Activity Log
      await tx.activityLog.create({
        data: {
          projectId,
          actorId,
          action: ActivityAction.COLUMN_REORDERED,
          entityType: "KANBAN_COLUMN",
          metadata: {
            columns: items.map((i) => ({
              id: i.id,
              name: existingMap.get(i.id)?.name,
              previousPosition: existingMap.get(i.id)?.position,
              newPosition: i.position,
            })),
          },
        },
      });

      // Trả về danh sách cột đã sắp xếp
      return tx.kanbanColumn.findMany({
        where: { projectId },
        orderBy: { position: "asc" },
      });
    });
  }
}
