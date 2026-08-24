import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FilesService } from './files.service';
import { MAX_UPLOAD_BYTES } from './lib/storage';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to server storage' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.saveUploadedFile(file);
  }

  @Get(':storageKey')
  @ApiOperation({ summary: 'Download uploaded file' })
  download(@Param('storageKey') storageKey: string, @Res({ passthrough: false }) res: Response) {
    return this.filesService.streamFile(storageKey, res);
  }

  @Delete(':storageKey')
  @ApiOperation({ summary: 'Delete uploaded file' })
  remove(@Param('storageKey') storageKey: string) {
    this.filesService.deleteFile(storageKey);
    return { deleted: true };
  }
}
