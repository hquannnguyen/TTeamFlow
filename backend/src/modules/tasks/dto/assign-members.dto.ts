import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class AssignMembersDto {
  @IsArray({ message: "userIds phải là một mảng" })
  @ArrayNotEmpty({ message: "Danh sách userIds không được để trống" })
  @IsString({ each: true, message: "Mỗi userId phải là một chuỗi" })
  userIds: string[];
}
