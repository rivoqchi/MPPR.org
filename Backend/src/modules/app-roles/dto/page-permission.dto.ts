import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class PagePermissionDto {
  @ApiProperty({ example: '/' })
  @IsString()
  pageKey!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  canView!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canCreate!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canEdit!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canDelete!: boolean;
}
