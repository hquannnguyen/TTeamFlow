import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[a-z]/, { message: "Mật khẩu phải có chữ thường" })
  @Matches(/[A-Z]/, { message: "Mật khẩu phải có chữ hoa" })
  @Matches(/\d/, { message: "Mật khẩu phải có chữ số" })
  @Matches(/[^A-Za-z0-9]/, { message: "Mật khẩu phải có ký tự đặc biệt" })
  password: string;
}
