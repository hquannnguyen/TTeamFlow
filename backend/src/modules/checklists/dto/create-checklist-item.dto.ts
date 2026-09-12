import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export class CreateChecklistItemDto {
  @IsNotEmpty({ message: "Nội dung không được để trống" })
  @IsString({ message: "Nội dung phải là chuỗi" })
  @MaxLength(500, { message: "Nội dung tối đa 500 ký tự" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  content: string;
}
