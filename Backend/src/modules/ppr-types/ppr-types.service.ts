import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ErrorCode } from '../../common/constants/error-codes';
import { CreatePprTypeDto } from './dto/create-ppr-type.dto';
import { UpdatePprTypeDto } from './dto/update-ppr-type.dto';
import { normalizePprTypeFiles } from './lib/normalize-files';

@Injectable()
export class PprTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private mapPprType<T extends { files: Prisma.JsonValue }>(pprType: T) {
    return {
      ...pprType,
      files: normalizePprTypeFiles(pprType.files),
    };
  }

  async findAll() {
    const pprTypes = await this.prisma.pprType.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return pprTypes.map((pprType) => this.mapPprType(pprType));
  }

  async findOne(id: string) {
    const pprType = await this.prisma.pprType.findUnique({ where: { id } });

    if (!pprType) {
      throw new NotFoundException(ErrorCode.PPR_TYPE_NOT_FOUND);
    }

    return this.mapPprType(pprType);
  }

  async create(dto: CreatePprTypeDto, createdByUserId?: string) {
    const creator = createdByUserId
      ? await this.prisma.user.findUnique({
          where: { id: createdByUserId },
          select: {
            structuralUnitId: true,
            withoutSectionAccess: true,
            structuralUnitSectionId: true,
          },
        })
      : null;

    const scopeType = creator?.withoutSectionAccess ? 'structure' : 'section';
    const sectionId =
      scopeType === 'structure' ? '' : (creator?.structuralUnitSectionId ?? '');

    const pprType = await this.prisma.pprType.create({
      data: {
        originalName: dto.originalName,
        shortName: dto.shortName,
        description: dto.description,
        files: normalizePprTypeFiles(dto.files ?? []),
        structuralUnitId: creator?.structuralUnitId ?? '',
        scopeType,
        sectionId,
        createdByUserId,
      },
    });

    this.realtimeService.emitEntityChange('ppr-types', 'create', this.mapPprType(pprType));

    return this.mapPprType(pprType);
  }

  async update(id: string, dto: UpdatePprTypeDto) {
    await this.findOne(id);

    const pprType = await this.prisma.pprType.update({
      where: { id },
      data: {
        ...(dto.originalName !== undefined && {
          originalName: dto.originalName,
        }),
        ...(dto.shortName !== undefined && { shortName: dto.shortName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.files !== undefined && {
          files: normalizePprTypeFiles(dto.files),
        }),
      },
    });

    this.realtimeService.emitEntityChange('ppr-types', 'update', this.mapPprType(pprType));

    return this.mapPprType(pprType);
  }

  async remove(id: string) {
    const pprType = await this.findOne(id);

    await this.prisma.pprType.delete({ where: { id } });

    this.realtimeService.emitEntityChange('ppr-types', 'delete', pprType);

    return { message: 'PPR type deleted successfully' };
  }
}
