import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

/** Dung lượng tối đa 1 tệp: 10MB */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
/** Số tệp tối đa trên mỗi task */
export const MAX_ATTACHMENTS_PER_TASK = 20;

export const ALLOWED_MIME_TYPES = [
  // Ảnh
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  // Văn bản / tài liệu
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Nén
  "application/zip",
  "application/x-zip-compressed",
] as const;

export class PresignAttachmentDto {
  @IsNotEmpty({ message: "Tên tệp không được để trống" })
  @IsString({ message: "Tên tệp phải là chuỗi" })
  @MaxLength(255, { message: "Tên tệp tối đa 255 ký tự" })
  fileName: string;

  @IsIn(ALLOWED_MIME_TYPES, {
    message: "Loại tệp không được hỗ trợ",
  })
  mimeType: string;

  @IsInt({ message: "Dung lượng phải là số nguyên" })
  @Min(1, { message: "Tệp không được rỗng" })
  @Max(MAX_ATTACHMENT_SIZE, { message: "Tệp tối đa 10MB" })
  @Type(() => Number)
  sizeBytes: number;
}
