import { IsNotEmpty, IsString, MinLength, Matches } from "class-validator";

export class ResetPasswordDto {
  @IsNotEmpty({ message: "Token không được để trống" })
  @IsString({ message: "Token phải là chuỗi" })
  token: string;

  @IsString({ message: "Mật khẩu phải là chuỗi" })
  @MinLength(8, { message: "Mật khẩu tối thiểu 8 ký tự" })
  @Matches(/[A-Z]/, { message: "Mật khẩu phải có ít nhất 1 chữ hoa" })
  @Matches(/[a-z]/, { message: "Mật khẩu phải có ít nhất 1 chữ thường" })
  @Matches(/[0-9]/, { message: "Mật khẩu phải có ít nhất 1 chữ số" })
  @Matches(/[^A-Za-z0-9]/, {
    message: "Mật khẩu phải có ít nhất 1 ký tự đặc biệt",
  })
  newPassword: string;
}
