import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Họ và tên không được để trống' })
  @MaxLength(100, { message: 'Họ và tên tối đa 100 ký tự' })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fullName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.replace(/[\s.-]/g, '');
  })
  @Matches(/^(0[2-9]\d{8,9}|\+[1-9]\d{7,14}|)$/, {
    message:
      'Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678 theo chuẩn E.164)',
  })
  phone?: string;
}
