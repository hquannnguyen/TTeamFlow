import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateColumnDto {
  @IsString()
  @IsNotEmpty({ message: "Tên cột không được để trống" })
  @MaxLength(100, { message: "Tên cột không quá 100 ký tự" })
  name: string;
}
