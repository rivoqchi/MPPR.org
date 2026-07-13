import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    await this.$executeRaw`SET client_encoding TO 'UTF8'`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
