import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class QueryNotificationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "page phải là số nguyên" })
  @Min(1, { message: "page tối thiểu là 1" })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "limit phải là số nguyên" })
  @Min(1, { message: "limit tối thiểu là 1" })
  @Max(100, { message: "limit tối đa là 100" })
  limit?: number = 20;

  @IsOptional()
  @Transform(
    ({ value }) =>
      value === "true" || value === true || value === 1 || value === "1",
  )
  @IsBoolean()
  unreadOnly?: boolean = false;
}
