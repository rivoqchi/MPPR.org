import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateDocumentServiceFileDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isServiceFile!: boolean;
}
