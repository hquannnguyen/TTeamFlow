import { IsInt, IsString, Min } from "class-validator";

export class MoveTaskDto {
  @IsString()
  targetColumnId: string;

  @IsInt()
  @Min(0)
  newPosition: number;
}
