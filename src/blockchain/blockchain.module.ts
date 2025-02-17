import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './services/blockchain.service';

@Module({
  imports: [ConfigModule],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {} 