import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;

  constructor(private configService: ConfigService) {}

  async get(key: string): Promise<string> {
    return await this.redisClient.get(key);
  }

  async ping(): Promise<string> {
    return await this.redisClient.ping();
  }

  async onModuleInit() {
    this.redisClient = createClient({
      url: `redis://${this.configService.get('REDIS_HOST')}:${this.configService.get('REDIS_PORT')}`,
      password: this.configService.get('REDIS_PASSWORD')
    });

    this.redisClient.on('error', (err) => console.error('❌Redis Client Error', err));
    await this.redisClient.connect();
    console.log('✅Redis client connected!');
  }

  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
