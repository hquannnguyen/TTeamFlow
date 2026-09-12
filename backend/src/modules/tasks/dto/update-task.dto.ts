import { TaskPriority } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateTaskDto {
  @IsOptional()
  @IsString({ message: "Tiêu đề phải là chuỗi" })
  @IsNotEmpty({ message: "Tiêu đề không được để trống" })
  @MaxLength(250, { message: "Tiêu đề tối đa 250 ký tự" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority, { message: "Độ ưu tiên không hợp lệ" })
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString({}, { message: "Ngày bắt đầu không đúng định dạng ISO" })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: "Ngày kết thúc không đúng định dạng ISO" })
  dueDate?: string;

  @IsOptional()
  @IsArray({ message: "Danh sách người thực hiện phải là mảng" })
  @ArrayUnique({ message: "Người thực hiện không được trùng lặp" })
  @IsString({ each: true, message: "ID người thực hiện phải là chuỗi" })
  assigneeIds?: string[];
}
