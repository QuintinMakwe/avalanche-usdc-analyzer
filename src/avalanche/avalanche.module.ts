import { Module } from '@nestjs/common';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AvalancheMonitorService } from './services/avalanche-monitor.service';
import { AvalancheIndexerService } from './services/avalanche-indexer.service';
import { AvalancheAggregationService } from './services/avalanche-aggregation.service';
import { AvalancheController } from './controllers/avalanche.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [BlockchainModule, PrismaModule, RedisModule],
  controllers: [AvalancheController],
  providers: [
    AvalancheMonitorService,
    AvalancheIndexerService,
    AvalancheAggregationService
  ],
  exports: [AvalancheMonitorService, AvalancheIndexerService]
})
export class AvalancheModule {} 