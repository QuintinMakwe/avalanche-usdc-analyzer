import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountStats, PaginationParams } from '../interfaces/avalanche.interface';


@Injectable()
export class AvalancheAggregationService {
  private readonly logger = new Logger(AvalancheAggregationService.name);
  private readonly USDC_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 10;

  constructor(private readonly prisma: PrismaService) { }

  async getTransferStats(
    startTime: Date,
    endTime: Date,
    tokenAddress: string = this.USDC_ADDRESS,
    pagination: PaginationParams = {}
  ) {
    const { page = this.DEFAULT_PAGE, limit = this.DEFAULT_LIMIT } = pagination;
    const skip = (page - 1) * limit;

    try {
      const [stats, transfers] = await this.prisma.$transaction([
        this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as "totalTransfers",
          COUNT(DISTINCT "fromAddress") as "uniqueSenders",
          COUNT(DISTINCT "toAddress") as "uniqueReceivers",
          COALESCE(SUM(CAST("amount" AS DECIMAL)), 0) as "totalVolume",
          COALESCE(AVG(CAST("amount" AS DECIMAL)), 0) as "averageTransferAmount"
        FROM "TokenTransfer"
        WHERE 
          "createdAt" >= ${new Date(startTime)}::timestamp
          AND "createdAt" <= ${new Date(endTime)}::timestamp
          AND "tokenAddress" = ${tokenAddress}
      `,
        // Get paginated transfers
        this.prisma.tokenTransfer.findMany({
          where: {
            timestamp: {
              gte: startTime,
              lte: endTime
            },
            tokenAddress: tokenAddress
          },
          orderBy: {
            timestamp: 'desc'
          },
          skip,
          take: limit
        })
      ]);
      console.log('result ', { stats, transfers });
      return {
        stats: {
          totalTransfers: Number(stats[0].totalTransfers),
          totalVolume: Number(stats[0].totalVolume).toFixed(2),
          uniqueSenders: Number(stats[0].uniqueSenders),
          uniqueReceivers: Number(stats[0].uniqueReceivers),
          averageTransferAmount: Number(stats[0].averageTransferAmount).toFixed(2)
        }
      };
    } catch (error) {
      this.logger.error('Error calculating transfer stats', error);
      throw new Error(`Failed to calculate transfer stats: ${error.message}`);
    }
  }

  async getTopAccounts(
    startTime: Date,
    endTime: Date,
    tokenAddress: string = this.USDC_ADDRESS,
    pagination: PaginationParams = {}
  ) {
    const { page = this.DEFAULT_PAGE, limit = this.DEFAULT_LIMIT } = pagination;
    const skip = (page - 1) * limit;

    const [accounts, totalResult] = await this.prisma.$transaction([
      this.prisma.$queryRaw`
        SELECT 
          address,
          "tokenAddress",
          symbol,
          "totalSent",
          "totalReceived",
          "totalSent" + "totalReceived" as "totalVolume",
          "transactionCount",
          "lastActive"
        FROM "AddressTokenStats"
        WHERE 
          "lastActive" >= ${new Date(startTime)}::timestamp
          AND "lastActive" <= ${new Date(endTime)}::timestamp
          AND "tokenAddress" = ${tokenAddress}
        ORDER BY "totalVolume" DESC
        LIMIT ${limit}
        OFFSET ${(page - 1) * limit}
      `,
      this.prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM "AddressTokenStats"
        WHERE 
          "lastActive" >= ${new Date(startTime)}::timestamp
          AND "lastActive" <= ${new Date(endTime)}::timestamp
          AND "tokenAddress" = ${tokenAddress}
      `
    ]);

    const total = Number(totalResult[0].total);

    return {
      accounts: (accounts as AccountStats[]).map(account => ({
        ...account,
        totalVolume: account.totalVolume.toString()
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getTransfersByTimeRange(
    startTime: Date,
    endTime: Date,
    pagination: PaginationParams = {}
  ) {
    const { page = this.DEFAULT_PAGE, limit = this.DEFAULT_LIMIT } = pagination;
    const skip = (page - 1) * limit;

    try {
      const [transfers, total] = await this.prisma.$transaction([
        this.prisma.tokenTransfer.findMany({
          where: {
            createdAt: {
              gte: startTime,
              lte: endTime
            },
            tokenAddress: this.USDC_ADDRESS
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit,
          select: {
            id: true,
            transactionHash: true,
            logIndex: true,
            blockNumber: true,
            fromAddress: true,
            toAddress: true,
            amount: true,
            timestamp: true,
            tokenAddress: true,
            symbol: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        this.prisma.tokenTransfer.count({
          where: {
            createdAt: {
              gte: startTime,
              lte: endTime
            },
            tokenAddress: this.USDC_ADDRESS
          }
        })
      ]);
      
      return {
        transfers: transfers.map(transfer => ({
          ...transfer,
          blockNumber: Number(transfer.blockNumber),
          amount: transfer.amount.toString(),
          timestamp: new Date(transfer.timestamp).toISOString(),
          createdAt: new Date(transfer.createdAt).toISOString(),
          updatedAt: new Date(transfer.updatedAt).toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Error fetching transfers by time range', error);
      throw new Error(`Failed to fetch transfers: ${error.message}`);
    }
  }
} 
