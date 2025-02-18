import { Test, TestingModule } from '@nestjs/testing';
import { AvalancheController } from '../avalanche/controllers/avalanche.controller';
import { AvalancheAggregationService } from '../avalanche/services/avalanche-aggregation.service';
import { EVMMonitorService } from '../blockchain/services/evm-monitor.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

describe('AvalancheController', () => {
  let controller: AvalancheController;
  let aggregationService: jest.Mocked<AvalancheAggregationService>;
  let monitorService: jest.Mocked<EVMMonitorService>;

  const mockTransfers = [
    {
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      value: '1000000.0',
      blockNumber: 1000,
      transactionHash: '0x123...',
      timestamp: Date.now(),
      symbol: 'USDC',
      tokenAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      logIndex: 0
    }
  ];

  beforeEach(async () => {
    aggregationService = {
      getTransferStats: jest.fn(),
      getTopAccounts: jest.fn(),
      getTransfersByTimeRange: jest.fn(),
    } as any;

    monitorService = {
      getTransfers: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvalancheController],
      providers: [
        { provide: AvalancheAggregationService, useValue: aggregationService },
        { provide: EVMMonitorService, useValue: monitorService },
      ],
    }).compile();

    controller = module.get<AvalancheController>(AvalancheController);
  });

  describe('getTransferStats', () => {
    it('should return transfer stats for valid time range', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');
      const mockStats = {
        stats: {
          totalTransfers: 10,
          totalVolume: '1000000.00',
          uniqueSenders: 5,
          uniqueReceivers: 3,
          averageTransferAmount: '100000.00'
        }
      };

      aggregationService.getTransferStats.mockResolvedValue(mockStats);
      const result = await controller.getTransferStats(startTime, endTime);
      
      expect(result).toEqual(mockStats);
      expect(aggregationService.getTransferStats).toHaveBeenCalledWith(
        startTime, 
        endTime, 
        '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        {}
      );
    });

    it('should handle invalid time range', async () => {
      const startTime = new Date('2024-01-02');
      const endTime = new Date('2024-01-01');

      await expect(controller.getTransferStats(startTime, endTime))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('getTopAccounts', () => {
    it('should return top accounts for valid parameters', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');
      const tokenAddress = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
      const page = 1;
      const limit = 10;

      const mockTopAccounts = {
        accounts: [{
          address: '0x1111111111111111111111111111111111111111',
          totalReceived: '1000000.0',
          totalSent: '500000.0',
          totalVolume: '1500000.0',
          tokenAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
          symbol: 'USDC',
          transactionCount: 10,
          lastActive: new Date()
        }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      };

      aggregationService.getTopAccounts.mockResolvedValue(mockTopAccounts);

      const result = await controller.getTopAccounts(
        startTime,
        endTime,
        tokenAddress,
        page,
        limit
      );

      expect(result).toEqual(mockTopAccounts);
      expect(aggregationService.getTopAccounts).toHaveBeenCalledWith(
        startTime,
        endTime,
        tokenAddress,
        { page, limit }
      );
    });

    it('should use default pagination values when not provided', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');

      await controller.getTopAccounts(startTime, endTime);

      expect(aggregationService.getTopAccounts).toHaveBeenCalledWith(
        startTime,
        endTime,
        '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        { page: 1, limit: 10 }
      );
    });

    it('should handle invalid pagination values', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');

      await expect(controller.getTopAccounts(
        startTime,
        endTime,
        undefined,
        -1,
        0   
      )).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTransfersByTimeRange', () => {
    it('should return transfers within time range with pagination', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');
      const mockTransferResponse = {
        transfers: [{
          id: '1',
          transactionHash: '0x123...',
          logIndex: 0,
          blockNumber: 1000,
          fromAddress: '0x1111111111111111111111111111111111111111',
          toAddress: '0x2222222222222222222222222222222222222222',
          amount: '1000000.0',
          timestamp: '2024-01-01T12:00:00.000Z',
          tokenAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
          symbol: 'USDC',
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z'
        }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1
        }
      };

      aggregationService.getTransfersByTimeRange.mockResolvedValue(mockTransferResponse);

      const result = await controller.getTransfersByTimeRange(
        startTime,
        endTime,
        1,
        10
      );

      expect(result).toEqual(mockTransferResponse);
      expect(aggregationService.getTransfersByTimeRange).toHaveBeenCalledWith(
        startTime,
        endTime,
        { page: 1, limit: 10 }
      );
    });

    it('should use default pagination values when not provided', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');

      await controller.getTransfersByTimeRange(startTime, endTime);

      expect(aggregationService.getTransfersByTimeRange).toHaveBeenCalledWith(
        startTime,
        endTime,
        { page: 1, limit: 10 }
      );
    });

    it('should throw BadRequestException for invalid time range', async () => {
      const startTime = new Date('2024-01-02');
      const endTime = new Date('2024-01-01');

      await expect(
        controller.getTransfersByTimeRange(startTime, endTime)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid pagination values', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-02');

      await expect(
        controller.getTransfersByTimeRange(startTime, endTime, -1, 0)
      ).rejects.toThrow(BadRequestException);
    });
  });
});