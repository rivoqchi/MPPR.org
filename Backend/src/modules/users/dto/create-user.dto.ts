import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ErrorCode } from '../../../common/constants/error-codes';

export class CreateUserDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  @MinLength(1, { message: ErrorCode.FIRST_NAME_REQUIRED })
  firstName!: string;

  @ApiProperty({ example: 'Valiyev' })
  @IsString()
  @MinLength(1, { message: ErrorCode.LAST_NAME_REQUIRED })
  lastName!: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsString()
  @MinLength(1, { message: ErrorCode.BIRTH_DATE_REQUIRED })
  birthDate!: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @MinLength(1, { message: ErrorCode.PHONE_REQUIRED })
  phone!: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @Matches(/^\d{5}$/, { message: ErrorCode.TABEL_NUMBER_FORMAT })
  tabelNumber!: string;

  @ApiProperty({ example: 'Mutaxassis' })
  @IsString()
  @MinLength(1, { message: ErrorCode.POSITION_REQUIRED })
  position!: string;

  @ApiProperty({ example: 'system-admin-role' })
  @IsString()
  @MinLength(1, { message: ErrorCode.ROLE_ID_REQUIRED })
  roleId!: string;

  @ApiProperty({ example: 'default-structural-unit' })
  @IsString()
  @MinLength(1, { message: ErrorCode.STRUCTURAL_UNIT_ID_REQUIRED })
  structuralUnitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  withoutSectionAccess?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  structuralUnitSectionId?: string;

  @ApiProperty({ example: '123123' })
  @IsString()
  @MinLength(4, { message: ErrorCode.PASSWORD_MIN_LENGTH })
  password!: string;
}
