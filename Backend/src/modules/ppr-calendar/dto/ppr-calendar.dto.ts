import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, ValidateIf } from 'class-validator';

export class GetPprCalendarMonthQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  structuralUnitId!: string;

  @ApiPropertyOptional({ description: 'Null for structure-wide calendar' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class GetPendingPprCalendarMonthsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((value: GetPendingPprCalendarMonthsQueryDto) => Boolean(value.structuralUnitId))
  @IsString()
  @MinLength(1)
  structuralUnitId?: string;
}

export class CreatePprCalendarEntryDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  structuralUnitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiProperty({ example: 7 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: '2026-07-15' })
  @IsString()
  @MinLength(10)
  date!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  pprTypeId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  objectIds!: string[];

  @ApiProperty({ enum: ['section', 'structure'] })
  @IsIn(['section', 'structure'])
  scopeType!: 'section' | 'structure';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entrySectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdatePprCalendarEntryDto {
  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  pprTypeId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectIds?: string[];

  @ApiPropertyOptional({ enum: ['section', 'structure'] })
  @IsOptional()
  @IsIn(['section', 'structure'])
  scopeType?: 'section' | 'structure';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entrySectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class GetApprovedPprCalendarMonthsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  structuralUnitId?: string;

  @ApiPropertyOptional({ enum: ['structure', 'section'] })
  @IsOptional()
  @IsIn(['structure', 'section'])
  scopeType?: 'structure' | 'section';

  @ApiPropertyOptional({ description: 'Filter by a specific section calendar' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  sectionId?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  fromYear?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  fromMonth?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  toYear?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  toMonth?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
