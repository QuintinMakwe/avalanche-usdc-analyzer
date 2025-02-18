import { Controller, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AvalancheMonitorService } from './avalanche-monitor.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransferEvent } from '../../blockchain/interfaces/blockchain.interface';
import { RedisService } from '../../redis/redis.service';
import { REDIS_KEYS } from '../config/constants';

@Injectable()
export class AvalancheIndexerService implements OnModuleInit {
  private readonly logger = new Logger(AvalancheIndexerService.name);
  private readonly BATCH_SIZE = 1000;

  constructor(
    private readonly monitorService: AvalancheMonitorService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async onModuleInit() {
    await this.initializeIndexing();
  }

  private async initializeIndexing() {
    try {
      const currentBlock = await this.monitorService.getLatestBlockNumber();
      
      const lastIndexedBlock = await this.redis.get(REDIS_KEYS.LAST_INDEXED_BLOCK_KEY);

      this.initializeTransferSubscription();

      if (lastIndexedBlock) {
        const lastBlock = parseInt(lastIndexedBlock);
        if (lastBlock < currentBlock) {
          this.logger.log(`Starting historical indexing from block ${lastBlock} to ${currentBlock}`);
          this.startHistoricalIndexing(lastBlock, currentBlock);
        }
      } else {
        await this.redis.set(REDIS_KEYS.LAST_INDEXED_BLOCK_KEY, currentBlock.toString());
      }
    } catch (error) {
      this.logger.error('Failed to initialize indexing', error);
      throw error;
    }
  }

  private async startHistoricalIndexing(fromBlock: number, toBlock: number) {
    try {
      for (let start = fromBlock; start < toBlock; start += this.BATCH_SIZE) {
        const end = Math.min(start + this.BATCH_SIZE, toBlock);
        await this.indexHistoricalTransfers(start, end);
        await this.redis.set(REDIS_KEYS.LAST_INDEXED_BLOCK_KEY, end.toString());
        this.logger.log(`Indexed historical blocks ${start} to ${end}`);
      }
      this.logger.log('Historical indexing completed');
    } catch (error) {
      this.logger.error('Error during historical indexing', error);
      //don't throw - let the service continue with real-time monitoring
    }
  }

  private async initializeTransferSubscription() {
    this.monitorService.subscribeToTransfers(async (transfer) => {
      await this.indexTransfer(transfer);
    });
    this.logger.log('Initialized transfer subscription');
  }

  private async indexTransfer(transfer: TransferEvent & { tokenAddress: string, symbol: string }) {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await this.prisma.$transaction(async (prisma) => {
          await prisma.tokenTransfer.upsert({
            where: {
              transactionHash_logIndex: {
                transactionHash: transfer.transactionHash,
                logIndex: transfer.logIndex
              }
            },
            create: {
              transactionHash: transfer.transactionHash,
              logIndex: transfer.logIndex,
              blockNumber: BigInt(transfer.blockNumber),
              fromAddress: transfer.from,
              toAddress: transfer.to,
              amount: transfer.value,
              timestamp: new Date(transfer.timestamp! * 1000),
              tokenAddress: transfer.tokenAddress,
              symbol: transfer.symbol
            },
            update: {}
          });

          //sort address to avoid cyclic locks.
          const [firstAddress, secondAddress] = [transfer.from, transfer.to].sort();
          
          await prisma.addressTokenStats.upsert({
            where: {
              address_tokenAddress: {
                address: firstAddress,
                tokenAddress: transfer.tokenAddress
              }
            },
            create: {
              address: firstAddress,
              tokenAddress: transfer.tokenAddress,
              symbol: transfer.symbol,
              totalSent: firstAddress === transfer.from ? transfer.value : '0',
              totalReceived: firstAddress === transfer.to ? transfer.value : '0',
              transactionCount: 1,
              lastActive: new Date(transfer.timestamp! * 1000)
            },
            update: {
              totalSent: firstAddress === transfer.from ? { increment: Number(transfer.value) } : undefined,
              totalReceived: firstAddress === transfer.to ? { increment: Number(transfer.value) } : undefined,
              transactionCount: { increment: 1 },
              lastActive: new Date(transfer.timestamp! * 1000)
            }
          });

          await prisma.addressTokenStats.upsert({
            where: {
              address_tokenAddress: {
                address: secondAddress,
                tokenAddress: transfer.tokenAddress
              }
            },
            create: {
              address: secondAddress,
              tokenAddress: transfer.tokenAddress,
              symbol: transfer.symbol,
              totalSent: secondAddress === transfer.from ? transfer.value : '0',
              totalReceived: secondAddress === transfer.to ? transfer.value : '0',
              transactionCount: 1,
              lastActive: new Date(transfer.timestamp! * 1000)
            },
            update: {
              totalSent: secondAddress === transfer.from ? { increment: Number(transfer.value) } : undefined,
              totalReceived: secondAddress === transfer.to ? { increment: Number(transfer.value) } : undefined,
              transactionCount: { increment: 1 },
              lastActive: new Date(transfer.timestamp! * 1000)
            }
          });

          const blockNumber = Number(transfer.blockNumber);
          const lastIndexedBlock = await this.redis.get(REDIS_KEYS.LAST_INDEXED_BLOCK_KEY);
          const currentLastBlock = lastIndexedBlock ? parseInt(lastIndexedBlock) : 0;
          
          if (blockNumber > currentLastBlock) {
            await this.redis.set(REDIS_KEYS.LAST_INDEXED_BLOCK_KEY, blockNumber.toString());
            this.logger.debug(`Updated last indexed block to ${blockNumber}`);
          }
        });
        break; 
      } catch (error) {
        //deadlock error code
        if (error.code === '40P01' && retryCount < maxRetries - 1) {
          retryCount++;
          this.logger.warn(`Deadlock detected for transfer ${transfer.transactionHash}, retry attempt ${retryCount}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        this.logger.error(`Failed to index transfer after ${retryCount} retries: ${error.message}`, error.stack);
        throw error;
      }
    }
  }

  async indexHistoricalTransfers(fromBlock: number, toBlock: number) {
    try {
      const transfers = await this.monitorService.getTokenTransfers(fromBlock, toBlock);
      for (const transfer of transfers) {
        await this.indexTransfer(transfer as TransferEvent & { tokenAddress: string, symbol: string });
      }
      this.logger.log(`Indexed historical transfers from block ${fromBlock} to ${toBlock}`);
    } catch (error) {
      this.logger.error(`Failed to index historical transfers: ${error.message}`, error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.monitorService.unsubscribeFromTransfers();
    this.logger.log('Cleaned up transfer subscription');
  }
} 