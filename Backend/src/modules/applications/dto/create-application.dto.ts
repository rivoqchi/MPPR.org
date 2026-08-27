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
  @ApiPropertyOptional({ enum: ['single', 'combined'], example: 'combined' })
  @IsOptional()
  @IsIn(['single', 'combined'])
  submissionMode?: 'single' | 'combined';

  @ApiProperty({ enum: ['auto', 'manual'], example: 'auto' })
  @IsIn(['auto', 'manual'])
  numberMode!: 'auto' | 'manual';

  @ApiPropertyOptional({ example: 'BB-2026-0001' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  applicationNumber?: string;

  @ApiProperty({ type: [String], example: ['user-id'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  recipientUserIds!: string[];

  @ApiPropertyOptional({ type: [String], example: ['unit-id'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  structuralUnitIds?: string[];

  @ApiPropertyOptional({ example: 'section-id' })
  @IsOptional()
  @IsString()
  structuralUnitSectionId?: string;

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
