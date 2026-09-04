import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Mật khẩu hiện tại không được để trống' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @MaxLength(72, { message: 'Mật khẩu mới tối đa 72 ký tự' })
  @Matches(/^(?=.*[A-Z])(?=.*[\d\W])/, {
    message:
      'Mật khẩu mới phải chứa ít nhất 1 chữ hoa và 1 chữ số hoặc ký tự đặc biệt',
  })
  newPassword: string;
}
