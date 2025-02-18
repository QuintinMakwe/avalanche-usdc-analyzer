import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(
    private readonly configService: ConfigService
  ) {
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      this.client = createClient({
        url: `redis://${this.configService.get('REDIS_HOST')}:6379`,
        password: this.configService.get('REDIS_PASSWORD')
      });

      this.client.on('error', (err) => this.logger.error('Redis Client Error', err));
      await this.client.connect();
      this.logger.log('Redis client connected');
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key ${key} from Redis`, error);
      throw error;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.client.set(key, value);
    } catch (error) {
      this.logger.error(`Failed to set key ${key} in Redis`, error);
      throw error;
    }
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }
}
