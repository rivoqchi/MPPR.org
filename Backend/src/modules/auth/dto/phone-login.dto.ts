import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { ErrorCode } from '../../../common/constants/error-codes';

export class PhoneLoginDto {
  @ApiProperty({ example: '+998947932005' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '123123' })
  @IsString()
  @MinLength(4, { message: ErrorCode.PASSWORD_MIN_LENGTH })
  password!: string;
}
