import { Test, TestingModule } from '@nestjs/testing';
import { AvalancheIndexerService } from '../avalanche/services/avalanche-indexer.service';
import { AvalancheMonitorService } from '../avalanche/services/avalanche-monitor.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransferEvent } from '../blockchain/interfaces/blockchain.interface';

describe('AvalancheIndexerService', () => {
  let indexerService: AvalancheIndexerService;
  let monitorService: jest.Mocked<AvalancheMonitorService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTransfer: TransferEvent & { tokenAddress: string; symbol: string } = {
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    value: '1000000',
    blockNumber: 1000,
    transactionHash: '0x123abc...',
    logIndex: 0,
    timestamp: Math.floor(Date.now() / 1000),
    tokenAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    symbol: 'USDC'
  };

  beforeEach(async () => {
    const prismaServiceMock = {
      $transaction: jest.fn((callback) => callback(prismaServiceMock)),
      tokenTransfer: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      addressTokenStats: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      $executeRaw: jest.fn(),
      $executeRawUnsafe: jest.fn(),
      $queryRaw: jest.fn(),
      $queryRawUnsafe: jest.fn(),
    };

    const monitorServiceMock = {
      subscribeToTransfers: jest.fn(),
      unsubscribeFromTransfers: jest.fn(),
      getTokenTransfers: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvalancheIndexerService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock
        },
        {
          provide: AvalancheMonitorService,
          useValue: monitorServiceMock
        }
      ],
    }).compile();

    indexerService = module.get<AvalancheIndexerService>(AvalancheIndexerService);
    monitorService = module.get(AvalancheMonitorService);
    prismaService = module.get(PrismaService);
  });

  describe('initialization', () => {
    it('should subscribe to transfers on creation', () => {
      expect(monitorService.subscribeToTransfers).toHaveBeenCalled();
    });
  });

  describe('indexHistoricalTransfers', () => {
    it('should process historical transfers successfully', async () => {
      monitorService.getTokenTransfers.mockResolvedValue([mockTransfer]);

      await indexerService.indexHistoricalTransfers(1000, 2000);

      expect(monitorService.getTokenTransfers).toHaveBeenCalledWith(1000, 2000);
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.tokenTransfer.upsert).toHaveBeenCalledWith({
        where: {
          transactionHash_logIndex: {
            transactionHash: mockTransfer.transactionHash,
            logIndex: mockTransfer.logIndex
          }
        },
        create: expect.objectContaining({
          transactionHash: mockTransfer.transactionHash,
          blockNumber: BigInt(mockTransfer.blockNumber),
          fromAddress: mockTransfer.from,
          toAddress: mockTransfer.to,
          amount: mockTransfer.value,
          tokenAddress: mockTransfer.tokenAddress,
          symbol: mockTransfer.symbol
        }),
        update: {}
      });
    });

    it('should handle network errors during historical indexing', async () => {
      const error = new Error('Network error');
      monitorService.getTokenTransfers.mockRejectedValue(error);

      await expect(indexerService.indexHistoricalTransfers(1000, 2000))
        .rejects
        .toThrow('Network error');
    });
  });

  describe('transaction handling', () => {
    it('should handle deadlock and retry successfully', async () => {
      let attempts = 0;
      const mockPrisma = {
        tokenTransfer: {
          upsert: jest.fn().mockResolvedValue({})
        },
        addressTokenStats: {
          upsert: jest.fn().mockResolvedValue({})
        },
        $executeRaw: jest.fn(),
        $executeRawUnsafe: jest.fn(),
        $queryRaw: jest.fn(),
        $queryRawUnsafe: jest.fn(),
        $transaction: jest.fn()
      } as any;

      prismaService.$transaction.mockImplementation(async (callback) => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('deadlock detected');
          error['code'] = '40P01';
          throw error;
        }
        return callback(mockPrisma);
      });

      const transferCallback = monitorService.subscribeToTransfers.mock.calls[0][0];
      await transferCallback(mockTransfer);

      expect(attempts).toBe(2);
      // The second attempt should succeed and call upsert
      expect(mockPrisma.tokenTransfer.upsert).toHaveBeenCalledWith({
        where: {
          transactionHash_logIndex: {
            transactionHash: mockTransfer.transactionHash,
            logIndex: mockTransfer.logIndex
          }
        },
        create: expect.objectContaining({
          transactionHash: mockTransfer.transactionHash,
          blockNumber: BigInt(mockTransfer.blockNumber),
          fromAddress: mockTransfer.from,
          toAddress: mockTransfer.to,
          amount: mockTransfer.value
        }),
        update: {}
      });
    });

    it('should update address stats for both sender and receiver', async () => {
      const transferCallback = monitorService.subscribeToTransfers.mock.calls[0][0];
      await transferCallback(mockTransfer);

      // Check sender stats update
      expect(prismaService.addressTokenStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            address_tokenAddress: {
              address: mockTransfer.from,
              tokenAddress: mockTransfer.tokenAddress
            }
          }
        })
      );

      // Check receiver stats update
      expect(prismaService.addressTokenStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            address_tokenAddress: {
              address: mockTransfer.to,
              tokenAddress: mockTransfer.tokenAddress
            }
          }
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from transfers on destroy', async () => {
      await indexerService.onModuleDestroy();
      expect(monitorService.unsubscribeFromTransfers).toHaveBeenCalled();
    });
  });
});