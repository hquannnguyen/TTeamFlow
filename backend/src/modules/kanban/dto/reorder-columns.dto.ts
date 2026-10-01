import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

export class ReorderColumnItemDto {
  @IsUUID("all", { message: "columnId phải là UUID hợp lệ" })
  @IsOptional()
  columnId?: string;

  @IsUUID("all", { message: "id phải là UUID hợp lệ" })
  @IsOptional()
  id?: string;

  @IsInt({ message: "position phải là số nguyên" })
  @Min(0, { message: "position phải lớn hơn hoặc bằng 0" })
  position: number;
}

export class ReorderColumnsDto {
  @IsArray({ message: "columns phải là một mảng" })
  @ArrayMinSize(1, { message: "columns phải có ít nhất 1 phần tử" })
  @ValidateNested({ each: true })
  @Type(() => ReorderColumnItemDto)
  columns: ReorderColumnItemDto[];
}
