import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateChecklistItemDto {
    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsBoolean()
    isCompleted?: boolean;
}