import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRegisteredObjectDto {
  @ApiProperty({ example: 'Markaziy obyekt' })
  @IsString()
  @MinLength(1)
  originalName!: string;

  @ApiProperty({ example: 'MO' })
  @IsString()
  @MinLength(1)
  shortName!: string;

  @ApiProperty({
    example: {
      latitude: 41.311081,
      longitude: 69.240562,
      address: 'Toshkent',
    },
  })
  @IsObject()
  location!: Record<string, unknown>;

  @ApiPropertyOptional({ example: [] })
  @IsOptional()
  @IsArray()
  documents?: unknown[];
}
