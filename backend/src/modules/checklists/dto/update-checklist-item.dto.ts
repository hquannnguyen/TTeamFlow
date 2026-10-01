import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsString({ message: "Nội dung phải là chuỗi" })
  @IsNotEmpty({ message: "Nội dung không được để trống" })
  @MaxLength(500, { message: "Nội dung tối đa 500 ký tự" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  content?: string;

  @IsOptional()
  @IsBoolean({ message: "Trạng thái hoàn thành phải là boolean" })
  isCompleted?: boolean;
}
