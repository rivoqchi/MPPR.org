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
import { StructuralUnitSectionDto } from './structural-unit-section.dto';

export class CreateStructuralUnitDto {
  @ApiProperty({ example: 'Bosh boshqarma' })
  @IsString()
  @MinLength(1)
  originalName!: string;

  @ApiProperty({ example: 'BB' })
  @IsString()
  @MinLength(1)
  shortName!: string;

  @ApiProperty({ example: 'Ali Valiyev' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  headFullName?: string;

  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  @MinLength(1)
  headUserId!: string;

  @ApiPropertyOptional({ type: [StoredDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoredDocumentDto)
  documents?: StoredDocumentDto[];

  @ApiPropertyOptional({ type: [StructuralUnitSectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StructuralUnitSectionDto)
  sections?: StructuralUnitSectionDto[];
}
