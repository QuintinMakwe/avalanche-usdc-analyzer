import { Controller, Injectable, Logger } from '@nestjs/common';
import { AvalancheMonitorService } from './avalanche-monitor.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransferEvent } from '../../blockchain/interfaces/blockchain.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class AvalancheIndexerService {
  private readonly logger = new Logger(AvalancheIndexerService.name);

  constructor(
    private readonly monitorService: AvalancheMonitorService,
    private readonly prisma: PrismaService
  ) {
    this.initializeTransferSubscription();
  }

  private async initializeTransferSubscription() {
    this.monitorService.subscribeToTransfers(async (transfer) => {
      await this.indexTransfer(transfer);
    });
    this.logger.log('Initialized transfer subscription');
  }

  private async indexTransfer(transfer: TransferEvent & { tokenAddress: string, symbol: string }) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.prisma.$transaction(async (prisma) => {
          // Insert transfer record
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

          // Update sender stats in one operation
          await prisma.addressTokenStats.upsert({
            where: {
              address_tokenAddress: {
                address: transfer.from,
                tokenAddress: transfer.tokenAddress
              }
            },
            create: {
              address: transfer.from,
              tokenAddress: transfer.tokenAddress,
              symbol: transfer.symbol,
              totalSent: transfer.value,
              totalReceived: '0',
              transactionCount: 1,
              lastActive: new Date(transfer.timestamp! * 1000)
            },
            update: {
              totalSent: {
                increment: Number(transfer.value)
              },
              transactionCount: { increment: 1 },
              lastActive: new Date(transfer.timestamp! * 1000)
            }
          });

          // Update receiver stats in one operation
          await prisma.addressTokenStats.upsert({
            where: {
              address_tokenAddress: {
                address: transfer.to,
                tokenAddress: transfer.tokenAddress
              }
            },
            create: {
              address: transfer.to,
              tokenAddress: transfer.tokenAddress,
              symbol: transfer.symbol,
              totalSent: '0',
              totalReceived: transfer.value,
              transactionCount: 1,
              lastActive: new Date(transfer.timestamp! * 1000)
            },
            update: {
              totalReceived: {
                increment: Number(transfer.value)
              },
              transactionCount: { increment: 1 },
              lastActive: new Date(transfer.timestamp! * 1000)
            }
          });
        });
        break;
        
      } catch (error) {
        if (error.code === '40P01' || error.message.includes('deadlock')) {
          attempt++;
          if (attempt === maxRetries) {
            this.logger.error(`Failed after ${maxRetries} retries due to deadlock`, error);
            throw error;
          }
          const delay = Math.pow(2, attempt - 1) * 1000;
          this.logger.warn(`Deadlock detected, retry attempt ${attempt} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
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