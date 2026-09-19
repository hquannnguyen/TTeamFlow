import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "Tên cột không quá 100 ký tự" })
  name?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
