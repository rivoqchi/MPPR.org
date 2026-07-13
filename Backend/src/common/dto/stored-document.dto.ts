import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class StoredDocumentDto {
  @ApiProperty({ example: 'doc-1' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'file.pdf' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 1024 })
  @IsNumber()
  @Min(0)
  size!: number;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dataUrl?: string;
}
