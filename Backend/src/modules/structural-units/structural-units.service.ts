import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StructuralUnit } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import {
  assertPagePermission,
  PAGE_KEYS,
} from '../../common/lib/assert-page-permission';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateStructuralUnitDto } from './dto/create-structural-unit.dto';
import { UpdateStructuralUnitDto } from './dto/update-structural-unit.dto';
import { normalizeStructuralUnitSections } from './lib/normalize-sections';

@Injectable()
export class StructuralUnitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private mapStructuralUnit(unit: StructuralUnit): StructuralUnit {
    return {
      ...unit,
      sections: normalizeStructuralUnitSections(unit.sections) as Prisma.JsonValue,
    };
  }

  private async resolveHeadUser(headUserId?: string | null) {
    const normalizedHeadUserId = headUserId?.trim() || null;

    if (!normalizedHeadUserId) {
      return {
        headUserId: null as string | null,
        headFullName: '',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: normalizedHeadUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
    }

    return {
      headUserId: user.id,
      headFullName: `${user.firstName} ${user.lastName}`.trim(),
    };
  }

  async findAll() {
    const units = await this.prisma.structuralUnit.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return units.map((unit) => this.mapStructuralUnit(unit));
  }

  async findOne(id: string) {
    const unit = await this.prisma.structuralUnit.findUnique({ where: { id } });

    if (!unit) {
      throw new NotFoundException(ErrorCode.STRUCTURAL_UNIT_NOT_FOUND);
    }

    return this.mapStructuralUnit(unit);
  }

  async create(dto: CreateStructuralUnitDto, createdByUserId: string) {
    await assertPagePermission(
      this.prisma,
      createdByUserId,
      PAGE_KEYS.structuralUnits,
      'canCreate',
    );

    const head = await this.resolveHeadUser(dto.headUserId);

    const unit = await this.prisma.structuralUnit.create({
      data: {
        originalName: dto.originalName,
        shortName: dto.shortName,
        headFullName: head.headFullName,
        headUserId: head.headUserId,
        documents: (dto.documents ?? []) as unknown as Prisma.InputJsonValue,
        sections: normalizeStructuralUnitSections(dto.sections ?? []),
        createdByUserId,
      },
    });

    this.realtimeService.emitEntityChange('structural-units', 'create', this.mapStructuralUnit(unit));

    return this.mapStructuralUnit(unit);
  }

  async update(id: string, dto: UpdateStructuralUnitDto, actorId: string) {
    await assertPagePermission(
      this.prisma,
      actorId,
      PAGE_KEYS.structuralUnits,
      'canEdit',
    );
    await this.findOne(id);

    const head =
      dto.headUserId !== undefined ? await this.resolveHeadUser(dto.headUserId) : null;

    const unit = await this.prisma.structuralUnit.update({
      where: { id },
      data: {
        ...(dto.originalName !== undefined && {
          originalName: dto.originalName,
        }),
        ...(dto.shortName !== undefined && { shortName: dto.shortName }),
        ...(head !== null && {
          headUserId: head.headUserId,
          headFullName: head.headFullName,
        }),
        ...(dto.documents !== undefined && {
          documents: dto.documents as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.sections !== undefined && {
          sections: normalizeStructuralUnitSections(dto.sections),
        }),
      },
    });

    this.realtimeService.emitEntityChange('structural-units', 'update', this.mapStructuralUnit(unit));

    return this.mapStructuralUnit(unit);
  }

  async remove(id: string, actorId: string) {
    await assertPagePermission(
      this.prisma,
      actorId,
      PAGE_KEYS.structuralUnits,
      'canDelete',
    );
    const unit = await this.findOne(id);

    const assignedUsersCount = await this.prisma.user.count({
      where: { structuralUnitId: id },
    });

    if (assignedUsersCount > 0) {
      throw new ConflictException(ErrorCode.STRUCTURAL_UNIT_IN_USE);
    }

    await this.prisma.structuralUnit.delete({ where: { id } });

    this.realtimeService.emitEntityChange('structural-units', 'delete', unit);

    return { message: 'Structural unit deleted successfully' };
  }
}
