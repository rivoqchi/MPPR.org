import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ApplicationAttachmentDto {
  @ApiProperty({ example: 'attachment-1' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'report.pdf' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 1024 })
  @IsNumber()
  @Min(0)
  size!: number;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ enum: ['image', 'file'] })
  @IsIn(['image', 'file'])
  kind!: 'image' | 'file';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataUrl?: string;
}
