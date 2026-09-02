import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserDocumentType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiPropertyOptional({ example: 'Yangi hujjat.docx' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ enum: UserDocumentType, default: UserDocumentType.FILE })
  @IsOptional()
  @IsEnum(UserDocumentType)
  type?: UserDocumentType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isServiceFile?: boolean;
}
