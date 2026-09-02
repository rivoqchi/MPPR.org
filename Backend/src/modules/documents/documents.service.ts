import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { copyFileSync, createReadStream, existsSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { UserDocumentType } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { PAGE_KEYS, assertPagePermission } from '../../common/lib/assert-page-permission';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { buildStorageKey, getUploadFilePath } from '../files/lib/storage';
import { FilesService } from '../files/files.service';
import type { CreateDocumentDto } from './dto/create-document.dto';
import {
  guessMimeTypeFromFileName,
  resolveOnlyOfficeDocumentMeta,
} from './lib/document-format';
import { insertPngIntoDocx } from './lib/insert-image-into-docx';
import type {
  OnlyOfficeAssetTokenPayload,
  OnlyOfficeCallbackPayload,
  OnlyOfficeEditorConfig,
  OnlyOfficeFileTokenPayload,
} from './lib/onlyoffice.types';

const BLANK_TEMPLATE_PATH = path.join(process.cwd(), 'assets', 'templates', 'blank.docx');
const DEFAULT_TITLE = 'Yangi hujjat.docx';
const ONLYOFFICE_SUPPORTED_LANGS = new Set(['en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'zh', 'ja', 'ko']);
const DOCUMENT_LIST_SELECT = {
  id: true,
  title: true,
  storageKey: true,
  type: true,
  isServiceFile: true,
  createdById: true,
  size: true,
  mimeType: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly filesService: FilesService,
  ) {}

  async create(userId: string, dto: CreateDocumentDto = {}) {
    await this.assertDocumentPermission(userId, 'canCreate', dto.type);

    if (!existsSync(BLANK_TEMPLATE_PATH)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const documentType = dto.type ?? UserDocumentType.FILE;
    const storageKey = buildStorageKey('document.docx');
    const filePath = getUploadFilePath(storageKey);
    copyFileSync(BLANK_TEMPLATE_PATH, filePath);
    const fileSize = statSync(filePath).size;
    const mimeType = guessMimeTypeFromFileName(DEFAULT_TITLE);

    const document = await this.prisma.userDocument.create({
      data: {
        title: dto.title?.trim() || DEFAULT_TITLE,
        storageKey,
        documentKey: randomUUID(),
        type: documentType,
        isServiceFile: dto.isServiceFile ?? false,
        size: fileSize,
        mimeType,
        createdById: userId,
      },
      select: DOCUMENT_LIST_SELECT,
    });

    return document;
  }

  async list(userId: string, type?: UserDocumentType) {
    await this.assertDocumentPermission(userId, 'canView', type);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { structuralUnitId: true },
    });

    if (!user) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }

    return this.prisma.userDocument.findMany({
      where: {
        ...(type ? { type } : {}),
        OR: [
          { createdById: userId },
          {
            isServiceFile: true,
            createdBy: { structuralUnitId: user.structuralUnitId },
          },
        ],
      },
      select: DOCUMENT_LIST_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upload(
    userId: string,
    file: Express.Multer.File,
    title?: string,
    type: UserDocumentType = UserDocumentType.FILE,
    isServiceFile = false,
  ) {
    await this.assertDocumentPermission(userId, 'canCreate', type);

    const uploaded = this.filesService.saveUploadedFile(file);
    const documentTitle = title?.trim() || uploaded.name;

    return this.prisma.userDocument.create({
      data: {
        title: documentTitle,
        storageKey: uploaded.id,
        documentKey: randomUUID(),
        type,
        isServiceFile,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
        createdById: userId,
      },
      select: DOCUMENT_LIST_SELECT,
    });
  }

  async getById(userId: string, documentId: string) {
    await this.assertDocumentPermission(userId, 'canView');
    const document = await this.getAccessibleDocument(documentId, userId);

    return this.prisma.userDocument.findUniqueOrThrow({
      where: { id: document.id },
      select: DOCUMENT_LIST_SELECT,
    });
  }

  async download(userId: string, documentId: string, res: Response) {
    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canView', document.type);

    const filePath = getUploadFilePath(document.storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    res.setHeader('Content-Type', document.mimeType || guessMimeTypeFromFileName(document.title));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.title)}"`,
    );
    res.setHeader('Cache-Control', 'no-store');

    createReadStream(filePath).pipe(res);
  }

  async preview(userId: string, documentId: string, res: Response) {
    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canView', document.type);

    const filePath = getUploadFilePath(document.storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    res.setHeader('Content-Type', document.mimeType || guessMimeTypeFromFileName(document.title));
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(document.title)}"`,
    );
    res.setHeader('Cache-Control', 'no-store');

    createReadStream(filePath).pipe(res);
  }

  async replaceFile(
    userId: string,
    documentId: string,
    file: Express.Multer.File,
    title?: string,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canCreate', document.type);

    const filePath = getUploadFilePath(document.storageKey);
    writeFileSync(filePath, file.buffer);

    const nextTitle = title?.trim() || document.title;
    const mimeType = file.mimetype || guessMimeTypeFromFileName(nextTitle);

    return this.prisma.userDocument.update({
      where: { id: document.id },
      data: {
        title: nextTitle,
        size: file.buffer.length,
        mimeType,
        documentKey: randomUUID(),
      },
      select: DOCUMENT_LIST_SELECT,
    });
  }

  async remove(userId: string, documentId: string) {
    const document = await this.getAccessibleDocument(documentId, userId, 'delete');
    await this.assertDocumentPermission(userId, 'canDelete');

    const filePath = getUploadFilePath(document.storageKey);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    await this.prisma.userDocument.delete({
      where: { id: document.id },
    });

    return { deleted: true };
  }

  async getEditorConfig(userId: string, documentId: string, lang = 'en') {
    await this.assertDocumentPermission(userId, 'canView');

    const document = await this.getAccessibleDocument(documentId, userId);
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!owner) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }

    const publicApiUrl = this.getPublicApiUrl();
    const fileToken = this.signFileToken(documentId);
    const { documentType, fileType } = resolveOnlyOfficeDocumentMeta(document.title);
    const editorLang = ONLYOFFICE_SUPPORTED_LANGS.has(lang) ? lang : 'en';
    const config: OnlyOfficeEditorConfig = {
      document: {
        fileType,
        key: document.documentKey,
        title: document.title,
        url: `${publicApiUrl}/documents/${document.id}/file?token=${encodeURIComponent(fileToken)}`,
        permissions: {
          edit: true,
          download: true,
          print: true,
        },
      },
      documentType,
      editorConfig: {
        callbackUrl: `${publicApiUrl}/documents/${document.id}/callback`,
        mode: 'edit',
        lang: editorLang,
        customization: {
          forcesave: true,
          autosave: true,
        },
        user: {
          id: owner.id,
          name: `${owner.firstName} ${owner.lastName}`.trim(),
        },
      },
    };

    return {
      ...config,
      token: this.signOnlyOfficePayload(config),
    };
  }

  streamDocumentFile(documentId: string, token: string | undefined, res: Response) {
    const payload = this.verifyFileToken(token);
    if (payload.documentId !== documentId) {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }

    return this.prisma.userDocument
      .findUnique({ where: { id: documentId } })
      .then((document) => {
        if (!document) {
          throw new NotFoundException(ErrorCode.NOT_FOUND);
        }

        const filePath = getUploadFilePath(document.storageKey);
        if (!existsSync(filePath)) {
          throw new NotFoundException(ErrorCode.NOT_FOUND);
        }

        res.setHeader(
          'Content-Type',
          document.mimeType ||
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.title)}"`);
        res.setHeader('Cache-Control', 'no-store');

        createReadStream(filePath).pipe(res);
      });
  }

  async handleCallback(documentId: string, body: OnlyOfficeCallbackPayload): Promise<{ error: 0 | 1 }> {
    let payload: OnlyOfficeCallbackPayload;

    try {
      payload = this.decodeCallbackPayload(body);
    } catch {
      this.logger.warn(`OnlyOffice callback JWT verification failed for document ${documentId}`);
      return { error: 1 };
    }

    const document = await this.prisma.userDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      this.logger.warn(`OnlyOffice callback: document not found (${documentId})`);
      return { error: 1 };
    }

    if (payload.status === 1 || payload.status === 4) {
      return { error: 0 };
    }

    if (payload.status === 3 || payload.status === 7) {
      this.logger.warn(
        `OnlyOffice save error status ${payload.status} for document ${documentId}`,
      );
      return { error: 1 };
    }

    if (payload.status === 2 || payload.status === 6) {
      if (!payload.url) {
        this.logger.warn(
          `OnlyOffice callback status ${payload.status} without download url (${documentId})`,
        );
        return { error: 1 };
      }

      try {
        const downloadUrl = this.resolveOnlyOfficeDownloadUrl(payload.url);
        const response = await fetch(downloadUrl);

        if (!response.ok) {
          this.logger.warn(
            `OnlyOffice save download failed (${response.status}) from ${downloadUrl}`,
          );
          return { error: 1 };
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const filePath = getUploadFilePath(document.storageKey);
        writeFileSync(filePath, buffer);

        await this.prisma.userDocument.update({
          where: { id: document.id },
          data: {
            documentKey: randomUUID(),
            size: buffer.length,
            updatedAt: new Date(),
          },
        });

        this.logger.log(`OnlyOffice document saved (${documentId})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`OnlyOffice callback save failed (${documentId}): ${message}`);
        return { error: 1 };
      }
    }

    return { error: 0 };
  }

  async saveAsArchive(userId: string, documentId: string) {
    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canCreate', UserDocumentType.ARCHIVE);

    const sourcePath = getUploadFilePath(document.storageKey);
    if (!existsSync(sourcePath)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const storageKey = buildStorageKey(document.title);
    const destPath = getUploadFilePath(storageKey);
    copyFileSync(sourcePath, destPath);
    const fileSize = statSync(destPath).size;

    return this.prisma.userDocument.create({
      data: {
        title: document.title,
        storageKey,
        documentKey: randomUUID(),
        type: UserDocumentType.ARCHIVE,
        size: fileSize,
        mimeType: document.mimeType,
        createdById: userId,
      },
      select: DOCUMENT_LIST_SELECT,
    });
  }

  async copyForAttachment(userId: string, documentId: string) {
    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canView', document.type);

    const sourcePath = getUploadFilePath(document.storageKey);
    if (!existsSync(sourcePath)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const storageKey = buildStorageKey(document.title);
    const destPath = getUploadFilePath(storageKey);
    copyFileSync(sourcePath, destPath);
    const fileSize = statSync(destPath).size;

    return {
      id: storageKey,
      name: document.title,
      size: fileSize,
      mimeType: document.mimeType || guessMimeTypeFromFileName(document.title),
    };
  }

  async getSaveState(userId: string, documentId: string) {
    const document = await this.getAccessibleDocument(documentId, userId);

    return {
      documentKey: document.documentKey,
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  async createQrImageUrl(userId: string, documentId: string, qrText: string) {
    await this.getAccessibleDocument(documentId, userId);

    const pngBuffer = await QRCode.toBuffer(qrText, {
      type: 'png',
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    const storageKey = buildStorageKey('qr.png');
    writeFileSync(getUploadFilePath(storageKey), pngBuffer);

    const token = this.signAssetToken(storageKey);
    const publicApiUrl = this.getPublicApiUrl();

    return {
      imageUrl: `${publicApiUrl}/documents/assets/file?key=${encodeURIComponent(storageKey)}&token=${encodeURIComponent(token)}`,
    };
  }

  async insertQrIntoDocument(
    userId: string,
    documentId: string,
    qrText: string,
    lang = 'en',
  ) {
    const document = await this.getAccessibleDocument(documentId, userId);
    const { fileType } = resolveOnlyOfficeDocumentMeta(document.title);

    if (fileType !== 'docx') {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const filePath = getUploadFilePath(document.storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const pngPromise = QRCode.toBuffer(qrText, {
      type: 'png',
      width: 200,
      margin: 0,
      errorCorrectionLevel: 'L',
    });

    try {
      await insertPngIntoDocx(filePath, pngPromise, 28);
    } catch {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const fileSize = statSync(filePath).size;
    const updated = await this.prisma.userDocument.update({
      where: { id: document.id },
      data: {
        documentKey: randomUUID(),
        size: fileSize,
      },
      select: {
        documentKey: true,
        updatedAt: true,
      },
    });

    return {
      documentKey: updated.documentKey,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  streamAssetFile(storageKey: string, token: string | undefined, res: Response) {
    const payload = this.verifyAssetToken(token);

    if (payload.storageKey !== storageKey) {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }

    const filePath = getUploadFilePath(storageKey);
    if (!existsSync(filePath)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');

    createReadStream(filePath).pipe(res);
  }

  private async assertDocumentPermission(
    userId: string,
    action: 'canView' | 'canCreate' | 'canDelete',
    documentType?: UserDocumentType,
  ) {
    const archiveKeys =
      documentType === UserDocumentType.ARCHIVE
        ? [PAGE_KEYS.archives, PAGE_KEYS.archivesNew]
        : [];

    const pageKeys =
      action === 'canView'
        ? [
            PAGE_KEYS.files,
            PAGE_KEYS.documentsNew,
            PAGE_KEYS.applicationsSubmit,
            ...archiveKeys,
          ]
        : action === 'canCreate'
          ? [
              PAGE_KEYS.files,
              PAGE_KEYS.documentsNew,
              PAGE_KEYS.applicationsSubmit,
              ...archiveKeys,
            ]
          : [
              PAGE_KEYS.files,
              PAGE_KEYS.documentsNew,
              PAGE_KEYS.applicationsSubmit,
              ...archiveKeys,
            ];

    let lastError: unknown;

    for (const pageKey of pageKeys) {
      try {
        await assertPagePermission(this.prisma, userId, pageKey, action);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof ForbiddenException) {
      throw lastError;
    }

    throw lastError;
  }

  private async getAccessibleDocument(
    documentId: string,
    userId: string,
    action: 'read' | 'delete' = 'read',
  ) {
    const [document, user] = await Promise.all([
      this.prisma.userDocument.findUnique({
        where: { id: documentId },
        include: {
          createdBy: {
            select: { structuralUnitId: true },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          structuralUnitId: true,
          appRole: {
            select: {
              isSystem: true,
            },
          },
        },
      }),
    ]);

    if (!document) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const isOwner = document.createdById === userId;
    const isAdmin = user?.appRole?.isSystem === true;
    const isServiceFilePeer =
      document.isServiceFile &&
      user?.structuralUnitId === document.createdBy.structuralUnitId;

    if (action === 'delete') {
      if (!isOwner && !isAdmin) {
        throw new ForbiddenException(ErrorCode.FORBIDDEN);
      }
    } else if (!isOwner && !isAdmin && !isServiceFilePeer) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    return document;
  }

  private getPublicApiUrl(): string {
    return this.configService.getOrThrow<string>('PUBLIC_API_URL').replace(/\/$/, '');
  }

  private resolveOnlyOfficeDownloadUrl(url: string): string {
    const onlyOfficeBase = this.configService
      .get<string>('ONLYOFFICE_SERVER_URL', 'http://localhost:8080')
      .replace(/\/$/, '');

    try {
      const parsed = new URL(url);
      if (parsed.pathname.includes('/cache/files/')) {
        return `${onlyOfficeBase}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // Keep the original URL when parsing fails.
    }

    return url;
  }

  private getOnlyOfficeSecret(): string {
    return this.configService.getOrThrow<string>('ONLYOFFICE_JWT_SECRET');
  }

  private signOnlyOfficePayload(payload: Record<string, unknown>): string {
    return this.jwtService.sign(payload, {
      secret: this.getOnlyOfficeSecret(),
    });
  }

  private signFileToken(documentId: string): string {
    const payload: OnlyOfficeFileTokenPayload = {
      documentId,
      type: 'file',
    };

    return this.jwtService.sign(payload, {
      secret: this.getOnlyOfficeSecret(),
      expiresIn: '1h',
    });
  }

  private signAssetToken(storageKey: string): string {
    const payload: OnlyOfficeAssetTokenPayload = {
      storageKey,
      type: 'asset',
    };

    return this.jwtService.sign(payload, {
      secret: this.getOnlyOfficeSecret(),
      expiresIn: '1h',
    });
  }

  private verifyAssetToken(token: string | undefined): OnlyOfficeAssetTokenPayload {
    if (!token) {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }

    try {
      const payload = this.jwtService.verify<OnlyOfficeAssetTokenPayload>(token, {
        secret: this.getOnlyOfficeSecret(),
      });

      if (payload.type !== 'asset' || typeof payload.storageKey !== 'string') {
        throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
      }

      return payload;
    } catch {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }
  }

  private verifyFileToken(token: string | undefined): OnlyOfficeFileTokenPayload {
    if (!token) {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }

    try {
      const payload = this.jwtService.verify<OnlyOfficeFileTokenPayload>(token, {
        secret: this.getOnlyOfficeSecret(),
      });

      if (payload.type !== 'file' || typeof payload.documentId !== 'string') {
        throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
      }

      return payload;
    } catch {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }
  }

  private decodeCallbackPayload(body: OnlyOfficeCallbackPayload): OnlyOfficeCallbackPayload {
    if (body.token) {
      try {
        return this.jwtService.verify<OnlyOfficeCallbackPayload>(body.token, {
          secret: this.getOnlyOfficeSecret(),
        });
      } catch {
        throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
      }
    }

    return body;
  }
}
