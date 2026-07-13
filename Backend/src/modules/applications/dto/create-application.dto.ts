import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApplicationAttachmentDto } from './application-attachment.dto';
import { ApplicationSpecialMessageDto } from './application-special-message.dto';

export class CreateApplicationDto {
  @ApiProperty({ type: [String], example: ['unit-id'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  structuralUnitIds!: string[];

  @ApiProperty({ enum: ['execution', 'information'] })
  @IsIn(['execution', 'information'])
  type!: 'execution' | 'information';

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ type: [ApplicationAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAttachmentDto)
  images?: ApplicationAttachmentDto[];

  @ApiPropertyOptional({ type: [ApplicationAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAttachmentDto)
  files?: ApplicationAttachmentDto[];

  @ApiProperty({ example: 'Ariza matni' })
  @IsString()
  @MinLength(3)
  comment!: string;

  @ApiPropertyOptional({ type: [ApplicationSpecialMessageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationSpecialMessageDto)
  specialMessages?: ApplicationSpecialMessageDto[];
}
