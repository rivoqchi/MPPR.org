import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class GetDashboardSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by structural unit' })
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

  @ApiPropertyOptional({ enum: ['all', 'submitted', 'incoming'] })
  @IsOptional()
  @IsIn(['all', 'submitted', 'incoming'])
  applicationScope?: 'all' | 'submitted' | 'incoming';
}
