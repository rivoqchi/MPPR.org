import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'ppr_calendar_submitted' })
  @IsString()
  @MinLength(1)
  type!: string;

  @ApiProperty({ example: 'New message' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: 'You have a new notification' })
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiPropertyOptional({ example: '/ppr-calendar?year=2026&month=7' })
  @IsOptional()
  @IsString()
  linkPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
