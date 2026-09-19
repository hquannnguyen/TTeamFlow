import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { ActivityAction } from "../constants/activity-action.constant";
import { ActivityEntityType } from "../constants/activity-entity.constant";

export class ActivityLogQueryDto {
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
  @IsIn(Object.values(ActivityAction), {
    message: "action không hợp lệ",
  })
  action?: ActivityAction;

  @IsOptional()
  @IsIn(Object.values(ActivityEntityType), {
    message: "entityType không hợp lệ",
  })
  entityType?: ActivityEntityType;
}
