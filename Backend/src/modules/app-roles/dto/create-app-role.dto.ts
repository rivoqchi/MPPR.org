import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { StoredDocumentDto } from '../../../common/dto/stored-document.dto';
import { PagePermissionDto } from './page-permission.dto';

export class CreateAppRoleDto {
  @ApiProperty({ example: 'Moderator' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'Moderator roli' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional({ type: [StoredDocumentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoredDocumentDto)
  documents?: StoredDocumentDto[];

  @ApiPropertyOptional({ type: [PagePermissionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagePermissionDto)
  permissions?: PagePermissionDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canViewAllStructuralUnits?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}
