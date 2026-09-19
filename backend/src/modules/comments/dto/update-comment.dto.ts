import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateCommentDto {
  @IsNotEmpty({ message: "Nội dung bình luận không được để trống" })
  @IsString({ message: "Nội dung bình luận phải là chuỗi" })
  @MaxLength(2000, { message: "Nội dung bình luận tối đa 2000 ký tự" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  content: string;
}
