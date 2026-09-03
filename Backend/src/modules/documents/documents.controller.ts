import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { UserDocumentType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types';
import { MAX_UPLOAD_BYTES } from '../files/lib/storage';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateQrImageDto } from './dto/create-qr-image.dto';
import { UpdateDocumentServiceFileDto } from './dto/update-document-service-file.dto';
import type { OnlyOfficeCallbackPayload } from './lib/onlyoffice.types';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('assets/file')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Stream temporary asset file for OnlyOffice' })
  streamAssetFile(
    @Query('key') key: string,
    @Query('token') token: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.documentsService.streamAssetFile(key, token, res);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List current user documents' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: UserDocumentType,
  ) {
    return this.documentsService.list(user.id, type);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a blank Word document' })
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.create(user.id, dto);
  }

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload a document file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string | undefined,
    @Body('type') type: UserDocumentType | undefined,
    @Body('isServiceFile') isServiceFile: string | boolean | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.upload(
      user.id,
      file,
      title,
      type ?? UserDocumentType.FILE,
      isServiceFile === true || isServiceFile === 'true',
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get document metadata' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.getById(user.id, id);
  }

  @Patch(':id/service-file')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Toggle service-file flag for a document' })
  updateServiceFile(
    @Param('id') id: string,
    @Body() body: UpdateDocumentServiceFileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.updateServiceFile(user.id, id, body.isServiceFile);
  }

  @Post(':id/save-as-archive')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save document copy as archive format' })
  saveAsArchive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.saveAsArchive(user.id, id);
  }

  @Post(':id/copy-for-attachment')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Copy document file for application attachment' })
  copyForAttachment(
    @Param('id') id: string,
    @Query('asPdf') asPdf: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const wantPdf = asPdf === '1' || asPdf === 'true';
    return this.documentsService.copyForAttachment(user.id, id, wantPdf);
  }

  @Get(':id/save-state')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get document save state for OnlyOffice polling' })
  getSaveState(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.getSaveState(user.id, id);
  }

  @Post(':id/qr-pdf-attachment')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create PDF attachment with QR stamped at exact coordinates' })
  createQrPdfAttachment(
    @Param('id') id: string,
    @Body() body: CreateQrImageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const hasRatios =
      body.pageIndex != null &&
      body.xRatio != null &&
      body.yRatio != null &&
      body.sizeRatio != null;
    const hasMm =
      body.pageIndex != null && body.offsetXMm != null && body.offsetYMm != null;

    if (!hasRatios && !hasMm) {
      return this.documentsService.copyForAttachment(user.id, id, true);
    }

    return this.documentsService.createQrPdfAttachment(user.id, id, body.text, {
      pageIndex: body.pageIndex ?? 0,
      offsetXMm: body.offsetXMm ?? 0,
      offsetYMm: body.offsetYMm ?? 0,
      sizeMm: body.sizeMm ?? 32,
      xRatio: body.xRatio,
      yRatio: body.yRatio,
      sizeRatio: body.sizeRatio,
    });
  }

  @Post(':id/insert-qr')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Insert QR code image into document file' })
  insertQr(
    @Param('id') id: string,
    @Body() body: CreateQrImageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.insertQrIntoDocument(
      user.id,
      id,
      body.text,
      body.lang,
      {
        pageIndex: body.pageIndex,
        offsetXMm: body.offsetXMm,
        offsetYMm: body.offsetYMm,
        sizeMm: body.sizeMm,
      },
    );
  }

  @Post(':id/qr-image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate QR PNG and return OnlyOffice-accessible URL' })
  createQrImage(
    @Param('id') id: string,
    @Body() body: CreateQrImageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.createQrImageUrl(user.id, id, body.text);
  }

  @Get(':id/editor-config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get OnlyOffice editor configuration' })
  getEditorConfig(
    @Param('id') id: string,
    @Query('lang') lang: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.getEditorConfig(user.id, id, lang ?? 'en');
  }

  @Get(':id/preview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Preview document file inline' })
  preview(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.documentsService.preview(user.id, id, res);
  }

  @Get(':id/pdf-preview')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Convert document to PDF for QR placement preview' })
  pdfPreview(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.documentsService.streamPdfPreview(user.id, id, res);
  }

  @Get(':id/download')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download document file' })
  download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.documentsService.download(user.id, id, res);
  }

  @Get(':id/file')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Download document file for OnlyOffice' })
  downloadFile(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.documentsService.streamDocumentFile(id, token, res);
  }

  @Post(':id/callback')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'OnlyOffice document save callback' })
  async callback(
    @Param('id') id: string,
    @Body() body: OnlyOfficeCallbackPayload,
    @Res({ passthrough: false }) res: Response,
  ) {
    try {
      const result = await this.documentsService.handleCallback(id, body);
      res.status(200).json(result);
    } catch {
      res.status(200).json({ error: 1 });
    }
  }

  @Post(':id/replace-file')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Replace document file with a new version' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  replaceFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documentsService.replaceFile(user.id, id, file);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a document' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.remove(user.id, id);
  }
}
