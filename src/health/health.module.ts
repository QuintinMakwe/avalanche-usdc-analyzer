import { Module } from '@nestjs/common';
import { PrismaHealthIndicator } from './prisma.health';
import { HealthController } from './health.controller';
import { RedisModule } from '../redis/redis.module';
import { RedisHealthIndicator } from './redis.health';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ RedisModule, PrismaModule ],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
  controllers: [HealthController]
})
export class HealthModule {}
