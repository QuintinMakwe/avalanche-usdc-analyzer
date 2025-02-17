import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ConfigModule } from '@nestjs/config';
import { configValidationSchema } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { AvalancheModule } from './avalanche/avalanche.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
    }),
    BlockchainModule,
    HealthModule,
    RedisModule,
    PrismaModule,
    AvalancheModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
