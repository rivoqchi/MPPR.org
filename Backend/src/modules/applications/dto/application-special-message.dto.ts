import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ApplicationSpecialMessageDto {
  @ApiProperty({ example: 'unit-id' })
  @IsString()
  structuralUnitId!: string;

  @ApiProperty({ example: 'Maxsus xabar' })
  @IsString()
  @MinLength(1)
  message!: string;
}
