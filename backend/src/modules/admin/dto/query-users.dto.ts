import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class QueryUsersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page phải là số nguyên" })
  @Min(1, { message: "page phải lớn hơn hoặc bằng 1" })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit phải là số nguyên" })
  @Min(1, { message: "limit phải lớn hơn hoặc bằng 1" })
  @Max(100, { message: "limit tối đa là 100" })
  limit: number = 20;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  })
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(["createdAt", "fullName", "email"], {
    message: "sortBy chỉ chấp nhận createdAt, fullName hoặc email",
  })
  sortBy: "createdAt" | "fullName" | "email" = "createdAt";

  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc"], {
    message: "sortOrder chỉ chấp nhận asc hoặc desc",
  })
  sortOrder: "asc" | "desc" = "desc";
}

