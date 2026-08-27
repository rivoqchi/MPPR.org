import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApplicationAttachmentDto } from './application-attachment.dto';

export const APPLICATION_WORKFLOW_UNIT_STATUSES = [
  'returned',
  'in_progress_work',
  'pending_confirmation',
] as const;

export const APPLICATION_WORKFLOW_STATUSES = [
  ...APPLICATION_WORKFLOW_UNIT_STATUSES,
  'confirmed',
  'cancelled',
] as const;

export type ApplicationWorkflowStatus = (typeof APPLICATION_WORKFLOW_STATUSES)[number];

export class CreateWorkflowMessageDto {
  @ApiPropertyOptional({ example: "Ish jarayoni bo'yicha izoh" })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ type: [ApplicationAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAttachmentDto)
  attachments?: ApplicationAttachmentDto[];
}

export class UpdateWorkflowMessageDto {
  @ApiPropertyOptional({ example: 'Yangilangan javob' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ type: [ApplicationAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAttachmentDto)
  attachments?: ApplicationAttachmentDto[];
}

export class ForwardWorkflowDto {
  @ApiProperty({ example: 'user-id' })
  @IsString()
  @MinLength(1)
  toUserId!: string;
}

export class ReleaseWorkflowDto {
  @ApiPropertyOptional({ example: 'assignment-id' })
  @IsOptional()
  @IsString()
  assignmentId?: string;
}

export class UpdateWorkflowStatusDto {
  @ApiProperty({ enum: APPLICATION_WORKFLOW_UNIT_STATUSES })
  @IsIn(APPLICATION_WORKFLOW_UNIT_STATUSES)
  workflowStatus!: ApplicationWorkflowStatus;

  @ApiPropertyOptional({ type: [ApplicationAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAttachmentDto)
  confirmationFiles?: ApplicationAttachmentDto[];
}
