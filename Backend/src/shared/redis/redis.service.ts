import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    const options = {
      host,
      port,
      maxRetriesPerRequest: null,
      connectTimeout: 5_000,
      retryStrategy: (times: number) => Math.min(times * 200, 5_000),
    };

    this.client = new Redis(options);
    this.subscriber = new Redis(options);

    for (const connection of [this.client, this.subscriber]) {
      this.attachErrorHandler(connection);
    }
  }

  private attachErrorHandler(connection: Redis) {
    connection.on('error', (error: Error) => {
      const message = error.message || 'connection failed';
      this.logger.warn(`Redis connection issue: ${message}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  createDuplicateClient(): Redis {
    const duplicate = this.client.duplicate();
    this.attachErrorHandler(duplicate);
    return duplicate;
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
    await this.client.quit();
  }
}
