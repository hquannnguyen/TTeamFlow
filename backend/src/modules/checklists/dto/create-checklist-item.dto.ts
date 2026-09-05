import { IsNotEmpty, IsString } from 'class-validator';

export class CreateChecklistItemDto {
    @IsNotEmpty({ message: 'Nội dung không được để trống' })
    @IsString()
    content: string;
}