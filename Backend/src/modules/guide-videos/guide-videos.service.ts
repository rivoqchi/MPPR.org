import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { createReadStream, existsSync, promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { ErrorCode } from '../../common/constants/error-codes';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { InitGuideVideoUploadDto } from './dto/init-guide-video-upload.dto';
import {
  UpdateGuideVideoDto,
  UpdateGuideVideoProgressDto,
} from './dto/update-guide-video.dto';
import {
  assertGuideCreateAccess,
  assertGuideDeleteAccess,
  assertGuideEditAccess,
  assertGuideViewAccess,
} from './lib/assert-guide-access';
import {
  ALLOWED_GUIDE_VIDEO_MIME_TYPES,
  ensureGuideVideoDirectories,
  getGuideUploadTempPath,
  getGuideVideoFilePath,
  MAX_GUIDE_VIDEO_BYTES,
} from './lib/storage';

interface UploadSession {
  uploadId: string;
  title: string;
  description: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  createdByUserId: string;
  receivedBytes: number;
  createdAt: number;
}

@Injectable()
export class GuideVideosService implements OnModuleInit {
  private readonly uploadSessions = new Map<string, UploadSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  onModuleInit() {
    ensureGuideVideoDirectories();
  }

  private serializeVideo(
    video: {
      id: string;
      title: string;
      description: string;
      fileName: string;
      mimeType: string;
      sizeBytes: bigint;
      storageKey: string;
      durationSec: number | null;
      sortOrder: number;
      createdByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    progress?: { watched: boolean; watchedAt: Date | null } | null,
  ) {
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      fileName: video.fileName,
      mimeType: video.mimeType,
      sizeBytes: Number(video.sizeBytes),
      durationSec: video.durationSec,
      sortOrder: video.sortOrder,
      createdByUserId: video.createdByUserId,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      watched: progress?.watched ?? false,
      watchedAt: progress?.watchedAt ?? null,
    };
  }

  async findAll(userId: string) {
    await assertGuideViewAccess(this.prisma, userId);

    const videos = await this.prisma.guideVideo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const progressRows = await this.prisma.guideVideoProgress.findMany({
      where: {
        userId,
        videoId: { in: videos.map((item) => item.id) },
      },
    });

    const progressByVideoId = new Map(
      progressRows.map((item) => [item.videoId, item]),
    );

    return videos.map((video) =>
      this.serializeVideo(video, progressByVideoId.get(video.id)),
    );
  }

  async findOne(id: string, userId: string) {
    await assertGuideViewAccess(this.prisma, userId);

    const video = await this.prisma.guideVideo.findUnique({ where: { id } });

    if (!video) {
      throw new NotFoundException(ErrorCode.GUIDE_VIDEO_NOT_FOUND);
    }

    const progress = await this.prisma.guideVideoProgress.findUnique({
      where: {
        userId_videoId: { userId, videoId: id },
      },
    });

    return this.serializeVideo(video, progress);
  }

  async initUpload(dto: InitGuideVideoUploadDto, userId: string) {
    await assertGuideCreateAccess(this.prisma, userId);

    if (dto.sizeBytes > MAX_GUIDE_VIDEO_BYTES) {
      throw new BadRequestException(ErrorCode.GUIDE_VIDEO_FILE_TOO_LARGE);
    }

    if (!ALLOWED_GUIDE_VIDEO_MIME_TYPES.has(dto.mimeType)) {
      throw new BadRequestException(ErrorCode.GUIDE_VIDEO_INVALID_MIME);
    }

    const uploadId = randomUUID();
    const tempPath = getGuideUploadTempPath(uploadId);
    await fs.writeFile(tempPath, Buffer.alloc(0));

    const maxSort = await this.prisma.guideVideo.aggregate({
      _max: { sortOrder: true },
    });

    this.uploadSessions.set(uploadId, {
      uploadId,
      title: dto.title.trim(),
      description: (dto.description ?? '').trim(),
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      sortOrder: dto.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      createdByUserId: userId,
      receivedBytes: 0,
      createdAt: Date.now(),
    });

    return {
      uploadId,
      chunkSizeHint: 8 * 1024 * 1024,
      maxSizeBytes: MAX_GUIDE_VIDEO_BYTES,
    };
  }

  async appendChunk(uploadId: string, chunk: Buffer, userId: string) {
    await assertGuideCreateAccess(this.prisma, userId);

    const session = this.uploadSessions.get(uploadId);

    if (!session || session.createdByUserId !== userId) {
      throw new NotFoundException(ErrorCode.GUIDE_VIDEO_UPLOAD_NOT_FOUND);
    }

    if (session.receivedBytes + chunk.length > session.sizeBytes) {
      throw new BadRequestException(ErrorCode.GUIDE_VIDEO_FILE_TOO_LARGE);
    }

    const tempPath = getGuideUploadTempPath(uploadId);
    await fs.appendFile(tempPath, chunk);
    session.receivedBytes += chunk.length;

    return {
      uploadId,
      receivedBytes: session.receivedBytes,
      sizeBytes: session.sizeBytes,
      complete: session.receivedBytes >= session.sizeBytes,
    };
  }

  async completeUpload(uploadId: string, userId: string) {
    await assertGuideCreateAccess(this.prisma, userId);

    const session = this.uploadSessions.get(uploadId);

    if (!session || session.createdByUserId !== userId) {
      throw new NotFoundException(ErrorCode.GUIDE_VIDEO_UPLOAD_NOT_FOUND);
    }

    if (session.receivedBytes !== session.sizeBytes) {
      throw new BadRequestException(ErrorCode.GUIDE_VIDEO_UPLOAD_INCOMPLETE);
    }

    const extension = session.fileName.includes('.')
      ? session.fileName.slice(session.fileName.lastIndexOf('.'))
      : '';
    const storageKey = `${randomUUID()}${extension}`;
    const tempPath = getGuideUploadTempPath(uploadId);
    const finalPath = getGuideVideoFilePath(storageKey);

    await fs.rename(tempPath, finalPath);

    const video = await this.prisma.guideVideo.create({
      data: {
        title: session.title,
        description: session.description,
        fileName: session.fileName,
        mimeType: session.mimeType,
        sizeBytes: BigInt(session.sizeBytes),
        storageKey,
        sortOrder: session.sortOrder,
        createdByUserId: userId,
      },
    });

    this.uploadSessions.delete(uploadId);

    const serialized = this.serializeVideo(video);
    this.realtimeService.emitEntityChange('guide-videos', 'create', serialized);

    return serialized;
  }

  async update(id: string, dto: UpdateGuideVideoDto, userId: string) {
    await assertGuideEditAccess(this.prisma, userId);

    const existing = await this.prisma.guideVideo.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(ErrorCode.GUIDE_VIDEO_NOT_FOUND);
    }

    const video = await this.prisma.guideVideo.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.durationSec !== undefined
          ? { durationSec: dto.durationSec }
          : {}),
      },
    });

    const progress = await this.prisma.guideVideoProgress.findUnique({
      where: { userId_videoId: { userId, videoId: id } },
    });

    const serialized = this.serializeVideo(video, progress);
    this.realtimeService.emitEntityChange('guide-videos', 'update', serialized);

    return serialized;
  }

  async remove(id: string, userId: string) {
    await assertGuideDeleteAccess(this.prisma, userId);

    const existing = await this.prisma.guideVideo.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(ErrorCode.GUIDE_VIDEO_NOT_FOUND);
    }

    await this.prisma.guideVideo.delete({ where: { id } });

    const filePath = getGuideVideoFilePath(existing.storageKey);

    if (existsSync(filePath)) {
      await fs.unlink(filePath).catch(() => undefined);
    }

    this.realtimeService.emitEntityChange('guide-videos', 'delete', {
      id: existing.id,
    });

    return { message: 'Guide video deleted successfully' };
  }

  async updateProgress(
    id: string,
    dto: UpdateGuideVideoProgressDto,
    userId: string,
  ) {
    await assertGuideViewAccess(this.prisma, userId);

    const video = await this.prisma.guideVideo.findUnique({ where: { id } });

    if (!video) {
      throw new NotFoundException(ErrorCode.GUIDE_VIDEO_NOT_FOUND);
    }

    const progress = await this.prisma.guideVideoProgress.upsert({
      where: {
        userId_videoId: { userId, videoId: id },
      },
      create: {
        userId,
        videoId: id,
        watched: dto.watched,
        watchedAt: dto.watched ? new Date() : null,
      },
      update: {
        watched: dto.watched,
        watchedAt: dto.watched ? new Date() : null,
      },
    });

    return this.serializeVideo(video, progress);
  }

  async stream(id: string, userId: string, req: Request, res: Response) {
    await assertGuideViewAccess(this.prisma, userId);

    const video = await this.prisma.guideVideo.findUnique({ where: { id } });

    if (!video) {
      throw new NotFoundException(ErrorCode.GUIDE_VIDEO_NOT_FOUND);
    }

    const filePath = getGuideVideoFilePath(video.storageKey);

    if (!existsSync(filePath)) {
      throw new NotFoundException(ErrorCode.GUIDE_VIDEO_NOT_FOUND);
    }

    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', video.mimeType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(video.fileName)}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');

    if (!range) {
      res.setHeader('Content-Length', fileSize);
      res.status(200);
      createReadStream(filePath).pipe(res);
      return;
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range);

    if (!match) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const start = match[1] ? Number.parseInt(match[1], 10) : 0;
    const end = match[2]
      ? Number.parseInt(match[2], 10)
      : Math.min(start + 8 * 1024 * 1024 - 1, fileSize - 1);

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start >= fileSize ||
      end >= fileSize ||
      start > end
    ) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const chunkSize = end - start + 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunkSize);

    createReadStream(filePath, { start, end }).pipe(res);
  }
}
