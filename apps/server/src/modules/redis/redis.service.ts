import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super(configService.get<string>('redis.url') ?? 'redis://localhost:6379');
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
