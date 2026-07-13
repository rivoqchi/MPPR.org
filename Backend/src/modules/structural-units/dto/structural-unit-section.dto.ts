import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { StoredDocumentDto } from '../../../common/dto/stored-document.dto';

export class StructuralUnitSectionDto {
  @ApiProperty({ example: 'section-uuid' })
  @IsString()
  @MinLength(1)
  id!: string;

  @ApiProperty({ example: 'Kadrlar bo\'limi' })
  @IsString()
  @MinLength(1)
  originalName!: string;

  @ApiProperty({ example: 'KB' })
  @IsString()
  @MinLength(1)
  shortName!: string;

  @ApiPropertyOptional({ type: [StoredDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoredDocumentDto)
  documents?: StoredDocumentDto[];

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  updatedAt?: string;
}
