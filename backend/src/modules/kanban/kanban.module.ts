import { Module } from "@nestjs/common";
import { ColumnsController } from "./columns.controller";
import { KanbanController } from "./kanban.controller";
import { KanbanService } from "./kanban.service";

@Module({
  controllers: [KanbanController, ColumnsController],
  providers: [KanbanService],
})
export class KanbanModule {}
