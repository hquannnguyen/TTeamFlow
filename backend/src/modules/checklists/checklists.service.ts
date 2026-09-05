import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

@Injectable()
export class ChecklistsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(taskId: string, data: CreateChecklistItemDto) {
        // 1. Kiểm tra task có tồn tại không
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
        });

        if (!task) {
            throw new NotFoundException('Task không tồn tại');
        }

        // 2. Tự động tính toán vị trí (position) cho checklist item mới
        const lastItem = await this.prisma.checklistItem.findFirst({
            where: { taskId },
            orderBy: { position: 'desc' },
        });

        // Nếu đã có item thì cộng 1 vào vị trí cuối, nếu chưa có thì gán vị trí là 1
        const newPosition = lastItem ? lastItem.position + 1 : 1;

        // 3. Tạo bản ghi mới
        return this.prisma.checklistItem.create({
            data: {
                content: data.content,
                taskId: taskId,
                position: newPosition,
            },
        });
    }

    async update(id: string, data: UpdateChecklistItemDto) {
        return this.prisma.checklistItem.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.checklistItem.delete({
            where: { id },
        });
    }
}