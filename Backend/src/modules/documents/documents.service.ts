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
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { UserDocumentType } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { PAGE_KEYS, assertPagePermission } from '../../common/lib/assert-page-permission';
import { ObjectStorageService } from '../../shared/object-storage/object-storage.service';
import { objectStorageKey } from '../../shared/object-storage/storage-keys';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { buildStorageKey } from '../files/lib/storage';
import { FilesService } from '../files/files.service';
import type { CreateDocumentDto } from './dto/create-document.dto';
import {
  guessMimeTypeFromFileName,
  resolveOnlyOfficeDocumentMeta,
} from './lib/document-format';
import { insertPngIntoDocxBuffer } from './lib/insert-image-into-docx';
import { stampQrOntoPdfBuffer } from './lib/stamp-qr-onto-pdf';
import { buildContentDispositionHeader } from './lib/content-disposition';
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
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
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
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async create(userId: string, dto: CreateDocumentDto = {}) {
    await this.assertDocumentPermission(userId, 'canCreate', dto.type);

    if (!existsSync(BLANK_TEMPLATE_PATH)) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const documentType = dto.type ?? UserDocumentType.FILE;
    const storageKey = buildStorageKey('document.docx');
    const templateBuffer = readFileSync(BLANK_TEMPLATE_PATH);
    const mimeType = guessMimeTypeFromFileName(DEFAULT_TITLE);

    await this.objectStorage.putObject(objectStorageKey(storageKey), templateBuffer, mimeType);

    return this.prisma.userDocument.create({
      data: {
        title: dto.title?.trim() || DEFAULT_TITLE,
        storageKey,
        documentKey: randomUUID(),
        type: documentType,
        isServiceFile: dto.isServiceFile ?? false,
        size: templateBuffer.length,
        mimeType,
        createdById: userId,
      },
      select: DOCUMENT_LIST_SELECT,
    });
  }

  async list(userId: string, type?: UserDocumentType) {
    await this.assertDocumentPermission(userId, 'canView', type);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }

    // Own files + all service files (any user with page access can open/edit them).
    return this.prisma.userDocument.findMany({
      where: {
        ...(type ? { type } : {}),
        OR: [{ createdById: userId }, { isServiceFile: true }],
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

    const uploaded = await this.filesService.saveUploadedFile(file);
    const documentTitle = this.ensureTitleExtension(
      title?.trim() || uploaded.name,
      uploaded.name || file.originalname || 'document.docx',
    );

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
    await this.getAccessibleDocument(documentId, userId);

    const document = await this.prisma.userDocument.findUnique({
      where: { id: documentId },
      select: DOCUMENT_LIST_SELECT,
    });

    if (!document) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    return document;
  }

  async updateServiceFile(userId: string, documentId: string, isServiceFile: boolean) {
    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canCreate', document.type);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { appRole: { select: { isSystem: true } } },
    });

    const isOwner = document.createdById === userId;
    const isAdmin = user?.appRole?.isSystem === true;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    if (document.type !== UserDocumentType.FILE) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    return this.prisma.userDocument.update({
      where: { id: document.id },
      data: { isServiceFile },
      select: DOCUMENT_LIST_SELECT,
    });
  }

  async download(userId: string, documentId: string, res: Response) {
    return this.streamDocument(userId, documentId, res, 'attachment');
  }

  async preview(userId: string, documentId: string, res: Response) {
    return this.streamDocument(userId, documentId, res, 'inline');
  }

  private async streamDocument(
    userId: string,
    documentId: string,
    res: Response,
    disposition: 'attachment' | 'inline',
  ) {
    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canView');

    const key = objectStorageKey(document.storageKey);
    const mimeType = document.mimeType || guessMimeTypeFromFileName(document.title);

    const [meta, stream] = await Promise.all([
      this.objectStorage.getObjectMeta(key),
      this.objectStorage.getObjectStream(key),
    ]);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', buildContentDispositionHeader(document.title, disposition));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(meta.size));

    stream.pipe(res);
  }

  async replaceFile(userId: string, documentId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canCreate', document.type);

    const mimeType = file.mimetype || guessMimeTypeFromFileName(file.originalname || document.title);

    await this.objectStorage.putObject(
      objectStorageKey(document.storageKey),
      file.buffer,
      mimeType,
    );

    return this.prisma.userDocument.update({
      where: { id: document.id },
      data: {
        documentKey: randomUUID(),
        size: file.buffer.length,
        mimeType,
        updatedAt: new Date(),
      },
      select: DOCUMENT_LIST_SELECT,
    });
  }

  async remove(userId: string, documentId: string) {
    const document = await this.getAccessibleDocument(documentId, userId, 'delete');
    await this.assertDocumentPermission(userId, 'canDelete');

    await this.objectStorage.deleteObject(objectStorageKey(document.storageKey));

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
    const { documentType, fileType } = resolveOnlyOfficeDocumentMeta(
      document.title,
      document.mimeType,
    );
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

  async streamDocumentFile(documentId: string, token: string | undefined, res: Response) {
    const payload = this.verifyFileToken(token);
    if (payload.documentId !== documentId) {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }

    const document = await this.prisma.userDocument.findUnique({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const key = objectStorageKey(document.storageKey);
    const mimeType =
      document.mimeType ||
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const [meta, stream] = await Promise.all([
      this.objectStorage.getObjectMeta(key),
      this.objectStorage.getObjectStream(key),
    ]);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.title)}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(meta.size));

    stream.pipe(res);
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
        const mimeType =
          document.mimeType ||
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        await this.objectStorage.putObject(
          objectStorageKey(document.storageKey),
          buffer,
          mimeType,
        );

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

    const sourceKey = objectStorageKey(document.storageKey);
    if (!(await this.objectStorage.exists(sourceKey))) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const storageKey = buildStorageKey(document.title);
    const destinationKey = objectStorageKey(storageKey);

    await this.objectStorage.copyObject(sourceKey, destinationKey);
    const meta = await this.objectStorage.getObjectMeta(destinationKey);

    return this.prisma.userDocument.create({
      data: {
        title: document.title,
        storageKey,
        documentKey: randomUUID(),
        type: UserDocumentType.ARCHIVE,
        size: meta.size,
        mimeType: document.mimeType,
        createdById: userId,
      },
      select: DOCUMENT_LIST_SELECT,
    });
  }

  async copyForAttachment(userId: string, documentId: string, asPdf = false) {
    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canView', document.type);

    if (asPdf) {
      try {
        return await this.copyForAttachmentAsPdf(userId, document);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `PDF attachment failed for ${documentId}, falling back to source file: ${message}`,
        );
      }
    }

    const sourceKey = objectStorageKey(document.storageKey);
    if (!(await this.objectStorage.exists(sourceKey))) {
      throw new NotFoundException(ErrorCode.NOT_FOUND);
    }

    const storageKey = buildStorageKey(document.title);
    const destinationKey = objectStorageKey(storageKey);

    await this.objectStorage.copyObject(sourceKey, destinationKey);
    const meta = await this.objectStorage.getObjectMeta(destinationKey);

    return {
      id: storageKey,
      name: document.title,
      size: meta.size,
      mimeType: document.mimeType || guessMimeTypeFromFileName(document.title),
    };
  }

  private async copyForAttachmentAsPdf(
    userId: string,
    document: { id: string; title: string; storageKey: string; mimeType: string | null },
    qrStamp?: {
      text: string;
      pageIndex: number;
      offsetXMm: number;
      offsetYMm: number;
      sizeMm: number;
      xRatio?: number;
      yRatio?: number;
      sizeRatio?: number;
    },
  ) {
    let pdfBuffer = await this.convertDocumentToPdfBuffer(userId, document.id);

    if (qrStamp) {
      const pngBuffer = await QRCode.toBuffer(qrStamp.text, {
        type: 'png',
        width: 512,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      const A4_WIDTH_MM = 210;
      const xRatio =
        qrStamp.xRatio ??
        Math.min(1, Math.max(0, qrStamp.offsetXMm / A4_WIDTH_MM));
      const yRatio =
        qrStamp.yRatio ??
        Math.min(1, Math.max(0, qrStamp.offsetYMm / 297));
      const sizeRatio =
        qrStamp.sizeRatio ??
        Math.min(0.5, Math.max(0.04, qrStamp.sizeMm / A4_WIDTH_MM));

      pdfBuffer = await stampQrOntoPdfBuffer(pdfBuffer, pngBuffer, {
        pageIndex: qrStamp.pageIndex,
        xRatio,
        yRatio,
        sizeRatio,
      });
    }

    const pdfName = document.title.replace(/\.[^.]+$/i, '') + '.pdf';
    const storageKey = buildStorageKey(pdfName);

    await this.objectStorage.putObject(objectStorageKey(storageKey), pdfBuffer, 'application/pdf');

    return {
      id: storageKey,
      name: pdfName,
      size: pdfBuffer.length,
      mimeType: 'application/pdf',
    };
  }

  /**
   * Convert document to PDF and stamp QR at exact page coordinates for application attach.
   * Also bakes QR into the source DOCX (best-effort) so the library file stays updated.
   */
  async createQrPdfAttachment(
    userId: string,
    documentId: string,
    qrText: string,
    placement: {
      pageIndex: number;
      offsetXMm: number;
      offsetYMm: number;
      sizeMm: number;
      xRatio?: number;
      yRatio?: number;
      sizeRatio?: number;
    },
  ) {
    const document = await this.getAccessibleDocument(documentId, userId);
    await this.assertDocumentPermission(userId, 'canView', document.type);

    // Only stamp the PDF attachment. Do NOT mutate the library DOCX —
    // floating Word anchors do not match the placement UI and confuse "view".
    return this.copyForAttachmentAsPdf(userId, document, {
      text: qrText,
      pageIndex: placement.pageIndex,
      offsetXMm: placement.offsetXMm,
      offsetYMm: placement.offsetYMm,
      sizeMm: placement.sizeMm,
      xRatio: placement.xRatio,
      yRatio: placement.yRatio,
      sizeRatio: placement.sizeRatio,
    });
  }

  async streamPdfPreview(userId: string, documentId: string, res: Response) {
    await this.assertDocumentPermission(userId, 'canView');
    const document = await this.getAccessibleDocument(documentId, userId);
    const pdfBuffer = await this.convertDocumentToPdfBuffer(userId, document.id);
    const pdfName = document.title.replace(/\.[^.]+$/i, '') + '.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildContentDispositionHeader(pdfName, 'inline'));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.end(pdfBuffer);
  }

  private async convertDocumentToPdfBuffer(userId: string, documentId: string): Promise<Buffer> {
    const document = await this.getAccessibleDocument(documentId, userId);
    const { fileType } = resolveOnlyOfficeDocumentMeta(document.title, document.mimeType);

    if (fileType !== 'docx' && fileType !== 'doc' && fileType !== 'odt' && fileType !== 'rtf') {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const publicApiUrl = this.getPublicApiUrl();
    const onlyOfficeBase = this.configService
      .get<string>('ONLYOFFICE_SERVER_URL', 'http://localhost:8080')
      .replace(/\/$/, '');
    const fileToken = this.signFileToken(documentId);
    const conversionKey = randomUUID().replace(/-/g, '');

    const payload = {
      async: false,
      filetype: fileType,
      key: conversionKey,
      outputtype: 'pdf',
      title: document.title,
      url: `${publicApiUrl}/documents/${document.id}/file?token=${encodeURIComponent(fileToken)}`,
    };

    const token = this.signOnlyOfficePayload(payload);

    let response: globalThis.Response;
    try {
      response = await fetch(`${onlyOfficeBase}/ConvertService.ashx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ...payload, token }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`OnlyOffice convert request failed (${documentId}): ${message}`);
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    if (!response.ok) {
      this.logger.warn(`OnlyOffice convert HTTP ${response.status} (${documentId})`);
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const result = (await response.json()) as {
      endConvert?: boolean;
      fileUrl?: string;
      error?: number;
      percent?: number;
    };

    if (result.error || !result.fileUrl) {
      this.logger.warn(
        `OnlyOffice convert failed (${documentId}): ${JSON.stringify(result)}`,
      );
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const downloadUrl = this.resolveOnlyOfficeDownloadUrl(result.fileUrl);
    const pdfResponse = await fetch(downloadUrl);

    if (!pdfResponse.ok) {
      this.logger.warn(`OnlyOffice PDF download failed (${pdfResponse.status})`);
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    return Buffer.from(await pdfResponse.arrayBuffer());
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
    await this.objectStorage.putObject(objectStorageKey(storageKey), pngBuffer, 'image/png');

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
    _lang = 'en',
    placement?: {
      pageIndex?: number;
      offsetXMm?: number;
      offsetYMm?: number;
      sizeMm?: number;
    },
  ) {
    const document = await this.getAccessibleDocument(documentId, userId);
    const { fileType } = resolveOnlyOfficeDocumentMeta(document.title, document.mimeType);

    if (fileType !== 'docx') {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    const key = objectStorageKey(document.storageKey);
    const docxBuffer = await this.objectStorage.getObjectBuffer(key);

    const pngPromise = QRCode.toBuffer(qrText, {
      type: 'png',
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    const hasPlacement =
      placement?.pageIndex != null &&
      placement.offsetXMm != null &&
      placement.offsetYMm != null;

    let updatedBuffer: Buffer;

    try {
      updatedBuffer = await insertPngIntoDocxBuffer(
        docxBuffer,
        pngPromise,
        placement?.sizeMm ?? 28,
        hasPlacement
          ? {
              pageIndex: placement.pageIndex ?? 0,
              offsetXMm: placement.offsetXMm ?? 20,
              offsetYMm: placement.offsetYMm ?? 20,
              sizeMm: placement.sizeMm ?? 28,
            }
          : undefined,
      );
    } catch {
      throw new BadRequestException(ErrorCode.VALIDATION_FAILED);
    }

    await this.objectStorage.putObject(
      key,
      updatedBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    const updated = await this.prisma.userDocument.update({
      where: { id: document.id },
      data: {
        documentKey: randomUUID(),
        size: updatedBuffer.length,
        updatedAt: new Date(),
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

  async streamAssetFile(storageKey: string, token: string | undefined, res: Response) {
    const payload = this.verifyAssetToken(token);

    if (payload.storageKey !== storageKey) {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED);
    }

    const key = objectStorageKey(storageKey);
    const [meta, stream] = await Promise.all([
      this.objectStorage.getObjectMeta(key),
      this.objectStorage.getObjectStream(key),
    ]);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(meta.size));

    stream.pipe(res);
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
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
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
    // Service files: any authenticated user with page access may open and edit.
    const canUseServiceFile = document.isServiceFile === true;

    if (action === 'delete') {
      if (!isOwner && !isAdmin) {
        throw new ForbiddenException(ErrorCode.FORBIDDEN);
      }
    } else if (!isOwner && !isAdmin && !canUseServiceFile) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    return document;
  }

  private getPublicApiUrl(): string {
    return this.configService.getOrThrow<string>('PUBLIC_API_URL').replace(/\/$/, '');
  }

  private ensureTitleExtension(title: string, originalFileName: string): string {
    const trimmed = title.trim() || originalFileName;
    const originalExtension = originalFileName.split('.').pop()?.toLowerCase() ?? '';
    if (!originalExtension) {
      return trimmed;
    }

    const titleExtension = trimmed.includes('.')
      ? trimmed.split('.').pop()?.toLowerCase() ?? ''
      : '';

    if (titleExtension === originalExtension) {
      return trimmed;
    }

    if (titleExtension && titleExtension.length <= 5 && trimmed.includes('.')) {
      return trimmed;
    }

    return `${trimmed}.${originalExtension}`;
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
