import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { AvalancheService } from './avalanche.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  providers: [BlockchainService, AvalancheService],
  exports: [BlockchainService],
})
export class BlockchainModule {}