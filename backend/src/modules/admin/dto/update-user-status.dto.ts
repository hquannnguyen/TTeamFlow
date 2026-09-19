import { IsBoolean } from "class-validator";

export class UpdateUserStatusDto {
  @IsBoolean({ message: "isActive phải là kiểu boolean" })
  isActive: boolean;
}

