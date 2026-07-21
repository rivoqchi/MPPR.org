import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/types';
import { InitGuideVideoUploadDto } from './dto/init-guide-video-upload.dto';
import {
  UpdateGuideVideoDto,
  UpdateGuideVideoProgressDto,
} from './dto/update-guide-video.dto';
import { GuideVideosService } from './guide-videos.service';

@ApiTags('guide-videos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('guide-videos')
export class GuideVideosController {
  constructor(private readonly guideVideosService: GuideVideosService) {}

  @Get()
  @ApiOperation({ summary: 'List guide videos with current user progress' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.guideVideosService.findAll(user.id);
  }

  @Post('upload/init')
  @ApiOperation({ summary: 'Initialize chunked guide video upload' })
  initUpload(
    @Body() dto: InitGuideVideoUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guideVideosService.initUpload(dto, user.id);
  }

  @Put('upload/:uploadId/chunk')
  @ApiOperation({ summary: 'Append binary chunk to guide video upload' })
  async appendChunk(
    @Param('uploadId') uploadId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      req.on('end', () => resolve());
      req.on('error', (error) => reject(error));
    });

    const buffer = Buffer.concat(chunks);
    return this.guideVideosService.appendChunk(uploadId, buffer, user.id);
  }

  @Post('upload/:uploadId/complete')
  @ApiOperation({ summary: 'Complete chunked guide video upload' })
  completeUpload(
    @Param('uploadId') uploadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guideVideosService.completeUpload(uploadId, user.id);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream guide video with Range support' })
  stream(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.guideVideosService.stream(id, user.id, req, res);
  }

  @Post(':id/progress')
  @ApiOperation({ summary: 'Update current user watch progress' })
  updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateGuideVideoProgressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guideVideosService.updateProgress(id, dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guide video by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.guideVideosService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update guide video metadata' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGuideVideoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.guideVideosService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete guide video' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.guideVideosService.remove(id, user.id);
  }
}
