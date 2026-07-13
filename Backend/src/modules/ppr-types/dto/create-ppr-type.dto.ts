import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { StoredDocumentDto } from '../../../common/dto/stored-document.dto';

export class CreatePprTypeDto {
  @ApiProperty({ example: 'PPR turi 1' })
  @IsString()
  @MinLength(1)
  originalName!: string;

  @ApiProperty({ example: 'PPR1' })
  @IsString()
  @MinLength(1)
  shortName!: string;

  @ApiProperty({ example: 'Tavsif' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional({ type: [StoredDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoredDocumentDto)
  files?: StoredDocumentDto[];
}
