import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ErrorCode } from '../../../common/constants/error-codes';

export class PhoneLoginDto {
  @ApiProperty({ example: '+998947932005' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '123123' })
  @IsString()
  @MinLength(4, { message: ErrorCode.PASSWORD_MIN_LENGTH })
  password!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'When true, tokens expire in 365 days. Otherwise they expire in 30 days.',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
