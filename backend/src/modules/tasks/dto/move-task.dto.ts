import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class MoveTaskDto {
  @IsOptional()
  @IsString()
  sourceColumnId?: string;

  @IsString()
  targetColumnId: string;

  @IsInt()
  @Min(0)
  newPosition: number;
}
