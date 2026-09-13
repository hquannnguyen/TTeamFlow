import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Tên dự án phải có ít nhất 2 ký tự" })
  @MaxLength(120, { message: "Tên dự án tối đa 120 ký tự" })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "Mô tả tối đa 2000 ký tự" })
  description?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: "startDate phải là định dạng ngày hợp lệ (ISO8601)" },
  )
  startDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: "dueDate phải là định dạng ngày hợp lệ (ISO8601)" },
  )
  dueDate?: string;
}
