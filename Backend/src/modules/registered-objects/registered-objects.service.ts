import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '../../common/constants/error-codes';
import { RealtimeService } from '../../shared/realtime/realtime.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateRegisteredObjectDto } from './dto/create-registered-object.dto';
import { UpdateRegisteredObjectDto } from './dto/update-registered-object.dto';

@Injectable()
export class RegisteredObjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  findAll() {
    return this.prisma.registeredObject.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const object = await this.prisma.registeredObject.findUnique({
      where: { id },
    });

    if (!object) {
      throw new NotFoundException(ErrorCode.REGISTERED_OBJECT_NOT_FOUND);
    }

    return object;
  }

  async create(dto: CreateRegisteredObjectDto, createdByUserId?: string) {
    const object = await this.prisma.registeredObject.create({
      data: {
        originalName: dto.originalName,
        shortName: dto.shortName,
        location: dto.location as Prisma.InputJsonValue,
        documents: (dto.documents ?? []) as Prisma.InputJsonValue,
        createdByUserId,
      },
    });

    this.realtimeService.emitEntityChange('objects', 'create', object);

    return object;
  }

  async update(id: string, dto: UpdateRegisteredObjectDto) {
    await this.findOne(id);

    const object = await this.prisma.registeredObject.update({
      where: { id },
      data: {
        ...(dto.originalName !== undefined && {
          originalName: dto.originalName,
        }),
        ...(dto.shortName !== undefined && { shortName: dto.shortName }),
        ...(dto.location !== undefined && {
          location: dto.location as Prisma.InputJsonValue,
        }),
        ...(dto.documents !== undefined && {
          documents: dto.documents as Prisma.InputJsonValue,
        }),
      },
    });

    this.realtimeService.emitEntityChange('objects', 'update', object);

    return object;
  }

  async remove(id: string) {
    const object = await this.findOne(id);

    await this.prisma.registeredObject.delete({ where: { id } });

    this.realtimeService.emitEntityChange('objects', 'delete', object);

    return { message: 'Registered object deleted successfully' };
  }
}
