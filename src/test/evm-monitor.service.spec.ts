import { Test, TestingModule } from '@nestjs/testing';
import { EVMMonitorService } from '../blockchain/services/evm-monitor.service';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { Logger } from '@nestjs/common';


jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getNetwork: jest.fn().mockResolvedValue({ chainId: 43114 }),
      getLogs: jest.fn().mockResolvedValue([]),
      getBlock: jest.fn().mockResolvedValue({ timestamp: Date.now() }),
      getBlockNumber: jest.fn().mockResolvedValue(1000),
      on: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      destroy: jest.fn(),
      provider: {
        on: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        destroy: jest.fn(),
      }
    }))
  };
});

describe('EVMMonitorService', () => {
  let service: EVMMonitorService;
  let mockProvider: jest.Mocked<ethers.JsonRpcProvider>;
  let mockContract: jest.Mocked<ethers.Contract>;
  let mockBlockchainService: any;
  let mockConfig: any;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(async () => {
    mockProvider = {
      getNetwork: jest.fn().mockResolvedValue({ chainId: 43114 }),
      getLogs: jest.fn().mockResolvedValue([]),
      getBlock: jest.fn().mockResolvedValue({ timestamp: Date.now() }),
      getBlockNumber: jest.fn().mockResolvedValue(1000),
      on: jest.fn().mockImplementation((event, handler) => mockProvider),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      destroy: jest.fn(),
      provider: {
        on: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        destroy: jest.fn(),
      }
    } as any;

    const parsedLogResult: any = [];
    parsedLogResult.from = '0x1111111111111111111111111111111111111111';
    parsedLogResult.to = '0x2222222222222222222222222222222222222222';
    parsedLogResult.value = ethers.parseUnits('1000000', 6);

    mockContract = {
      filters: {
        Transfer: jest.fn(),
      },
      interface: {
        parseLog: jest.fn().mockReturnValue({
          args: parsedLogResult,
          name: 'Transfer',
          signature: 'Transfer(address,address,uint256)',
          topic: ethers.id('Transfer(address,address,uint256)'),
          fragment: { type: 'event', name: 'Transfer' } as ethers.EventFragment
        }),
      },
      balanceOf: jest.fn().mockResolvedValue(ethers.parseUnits('1000000', 6)),
      on: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as string,
    } as any;

    mockConfig = {
      get: jest.fn((key: string) => {
        const config = {
          'avalanche.rpc': 'http://localhost:8545',
          'avalanche.tokens.usdc': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        };
        return config[key];
      }),
    };

    mockBlockchainService = {
      get: mockConfig.get,
      logger: new Logger('BlockchainService'),
      providers: {},
      configService: mockConfig,
      getProvider: jest.fn().mockImplementation(() => ({
        getNetwork: jest.fn().mockResolvedValue({ chainId: 43114 }),
        getLogs: jest.fn().mockResolvedValue([]),
        getBlock: jest.fn().mockResolvedValue({ timestamp: Date.now() }),
        getBlockNumber: jest.fn().mockResolvedValue(1000),
        on: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        destroy: jest.fn(),
        provider: {
          on: jest.fn(),
          removeListener: jest.fn(),
          removeAllListeners: jest.fn(),
          destroy: jest.fn(),
        }
      })),
      getContract: jest.fn().mockReturnValue(mockContract),
      getBalance: jest.fn(),
      getTransfers: jest.fn(),
      subscribeToTransfers: jest.fn(),
      getRpcUrl: jest.fn().mockReturnValue('http://localhost:8545'),
      createContract: jest.fn().mockReturnValue(mockContract),
      getLogs: jest.fn().mockResolvedValue([]),
      getBlock: jest.fn().mockResolvedValue({ timestamp: Date.now() }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EVMMonitorService,
          useValue: new TestEVMMonitorService(mockBlockchainService, 'EVMMonitorService', [{
            address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
            symbol: 'USDC',
            decimals: 6
          }]),
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<EVMMonitorService>(EVMMonitorService);
  });

  afterEach(async () => {
    if (mockProvider) {
      mockProvider.removeAllListeners();
      mockProvider.provider?.removeAllListeners();
      await mockProvider.destroy?.();
    }
    if (mockContract) {
      mockContract.removeAllListeners();
    }
    jest.clearAllMocks();
  });

  it('should initialize provider successfully', async () => {
    const network = await mockProvider.getNetwork();
    expect(network.chainId).toBeDefined();
  });

  it('should return correct balance for address', async () => {
    const address = '0xuser1111111111111111111111111111111111111';
    const tokenAddress = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
    mockBlockchainService.getContract.mockReturnValue(mockContract);
    const balance = await service.getBalance(address, tokenAddress);
    expect(balance).toBe('1000000.0');
  });

  describe('getTransfers', () => {
    it('should fetch and parse transfer events correctly', async () => {
      const startBlock = 1000;
      const endBlock = 2000;
      
      mockBlockchainService.getLogs.mockResolvedValue([{
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: '1000000.0',
        blockNumber: startBlock,
        transactionHash: '0x123...'
      }]);

      const transfers = await service.getTransfers(startBlock, endBlock);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toMatchObject({
        from: '0x1111111111111111111111111111111111111111'.toLowerCase(),
        to: '0x2222222222222222222222222222222222222222'.toLowerCase(),
        value: '1000000.0',
        blockNumber: startBlock,
        transactionHash: '0x123...'
      });
    });

    it('should handle RPC errors gracefully', async () => {
      mockBlockchainService.getLogs.mockRejectedValue(new Error('RPC Error'));
      await expect(service.getTransfers(1000, 2000)).rejects.toThrow('RPC Error');
    });
  });

  describe('subscribeToTransfers', () => {
    it('should subscribe to transfer events', async () => {
      const callback = jest.fn();
      const timestamp = Date.now();

      mockProvider.on('error', () => {});
      
      const subscription = await service.subscribeToTransfers(callback);

      expect(mockContract.on).toHaveBeenCalledWith('Transfer', expect.any(Function));

      const handler = (mockContract.on as jest.Mock).mock.calls[0][1];
      const transferEvent = {
        log: {
          blockNumber: 1000,
          transactionHash: '0x123...',
          logIndex: 0,
        },
        args: {
          from: '0x1111111111111111111111111111111111111111',
          to: '0x2222222222222222222222222222222222222222',
          value: ethers.parseUnits('1000000', 6)
        },
        getBlock: jest.fn().mockResolvedValue({ timestamp }),
      };

      await handler(
        transferEvent.args.from,
        transferEvent.args.to,
        transferEvent.args.value,
        transferEvent
      );

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        from: '0x1111111111111111111111111111111111111111',
        to: '0x2222222222222222222222222222222222222222',
        value: '1000000.0',
        blockNumber: 1000,
        transactionHash: '0x123...'
      }));

    });

    afterEach(() => {
      mockProvider.removeListener('error', expect.any(Function));
      mockContract.removeListener('Transfer', expect.any(Function));
    });
  });
});

class TestEVMMonitorService extends EVMMonitorService {}