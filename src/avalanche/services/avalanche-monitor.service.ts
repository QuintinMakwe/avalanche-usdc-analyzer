import { Injectable } from '@nestjs/common';
import { EVMMonitorService } from '../../blockchain/services/evm-monitor.service';
import { BlockchainService } from '../../blockchain/services/blockchain.service';


@Injectable()
export class AvalancheMonitorService extends EVMMonitorService {
  constructor(blockchainService: BlockchainService) {
    const tokens = [
      {
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        decimals: 6,
        symbol: 'USDC'
      }
    ];

    super(blockchainService, 'avalanche', tokens);
  }

  async getTokenBalance(address: string, tokenAddress?: string): Promise<string> {
    return this.getBalance(address, tokenAddress || this.tokenConfigs[0].address);
  }

  async getBatchTokenBalances(addresses: string[], tokenAddress?: string): Promise<Map<string, string>> {
    return this.getBatchBalances(addresses, tokenAddress || this.tokenConfigs[0].address);
  }

  async getTokenTransfers(fromBlock: number, toBlock: number) {
    return this.getTransfers(fromBlock, toBlock);
  }
} 