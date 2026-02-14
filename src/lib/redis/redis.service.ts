import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ENVEnum } from '@/common/enum/env.enum';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const host =
      this.configService.get<string>(ENVEnum.REDIS_HOST) ?? '127.0.0.1';
    const port = Number(
      this.configService.get<string>(ENVEnum.REDIS_PORT) ?? '6379',
    );

    this.client = new Redis({
      host,
      port,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  getClient() {
    return this.client;
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async exists(key: string) {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async scanKeys(pattern: string) {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );

      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
