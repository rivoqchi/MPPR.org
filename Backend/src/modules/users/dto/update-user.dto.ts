import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';
import { ErrorCode } from '../../../common/constants/error-codes';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ali' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: ErrorCode.FIRST_NAME_REQUIRED })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: ErrorCode.LAST_NAME_REQUIRED })
  lastName?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: ErrorCode.BIRTH_DATE_REQUIRED })
  birthDate?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: ErrorCode.PHONE_REQUIRED })
  phone?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: ErrorCode.TABEL_NUMBER_FORMAT })
  tabelNumber?: string;

  @ApiPropertyOptional({ example: 'Mutaxassis' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: ErrorCode.POSITION_REQUIRED })
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1, { message: ErrorCode.ROLE_ID_REQUIRED })
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1, { message: ErrorCode.STRUCTURAL_UNIT_ID_REQUIRED })
  structuralUnitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  withoutSectionAccess?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  structuralUnitSectionId?: string | null;

  @ApiPropertyOptional({ example: '123123' })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: ErrorCode.PASSWORD_MIN_LENGTH })
  password?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
