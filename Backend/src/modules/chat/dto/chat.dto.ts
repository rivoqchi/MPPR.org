import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ChatAttachmentDto {
  @ApiProperty({ example: 'uuid.webm' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'voice.webm' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 1024 })
  @IsNumber()
  @Min(0)
  size!: number;

  @ApiProperty({ example: 'audio/webm' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ enum: ['image', 'video', 'file', 'voice'] })
  @IsIn(['image', 'video', 'file', 'voice'])
  kind!: 'image' | 'video' | 'file' | 'voice';

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSec?: number;
}

export class CreateConversationDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  peerUserId!: string;
}

export class CreateChatMessageDto {
  @ApiPropertyOptional({ example: 'Hello' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: [ChatAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];

  @ApiPropertyOptional({ example: 'message-uuid' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class UpdateChatMessageDto {
  @ApiProperty({ example: 'Updated text' })
  @IsString()
  @MinLength(1)
  content!: string;
}

export class DeleteChatMessageDto {
  @ApiPropertyOptional({ enum: ['me', 'everyone'], default: 'everyone' })
  @IsOptional()
  @IsIn(['me', 'everyone'])
  scope?: 'me' | 'everyone';
}

export class ListChatMessagesQueryDto {
  @ApiPropertyOptional({ description: 'ISO cursor: load older than this' })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({ description: 'ISO cursor: load newer than this' })
  @IsOptional()
  @IsString()
  after?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD filter by calendar day' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class ListChatMediaQueryDto {
  @ApiPropertyOptional({ enum: ['image', 'video', 'file', 'voice', 'all'] })
  @IsOptional()
  @IsIn(['image', 'video', 'file', 'voice', 'all'])
  type?: 'image' | 'video' | 'file' | 'voice' | 'all';
}
