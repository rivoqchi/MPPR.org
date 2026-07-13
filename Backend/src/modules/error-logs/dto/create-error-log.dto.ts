import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateErrorLogDto {
  @IsString()
  @IsIn(['api', 'frontend', 'route'])
  source!: 'api' | 'frontend' | 'route';

  @IsOptional()
  @IsString()
  @IsIn(['user', 'system'])
  severity?: 'user' | 'system';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  code?: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  hint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  route?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  method?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  statusCode?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
