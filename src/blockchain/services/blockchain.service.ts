import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { Contract, WebSocketProvider } from 'ethers';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  constructor(private readonly configService: ConfigService) {}

  getProvider(chainId: string): ethers.JsonRpcProvider {
    if (!this.providers.has(chainId)) {
      // const rpcUrl = this.configService.get<string>(`${chainId.toUpperCase()}_RPC_URL`);
      const rpcUrl = "https://api.avax.network/ext/bc/C/rpc"
      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for chain ${chainId}`);
      }
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      this.providers.set(chainId, provider);
    }
    return this.providers.get(chainId)!;
  }

  createContract(
    address: string,
    abi: string[],
    provider: ethers.WebSocketProvider
  ): Contract {
    return new Contract(address, abi, provider);
  }

  async getLogs(
    provider: WebSocketProvider, 
    filter: { address: string; fromBlock: number; toBlock: number; topics: string[] }
  ) {
    return provider.getLogs(filter);
  }

  async getBlock(
    provider: WebSocketProvider, 
    blockNumber: number
  ) {
    return provider.getBlock(blockNumber);
  }

  async getLatestBlockNumber(provider: WebSocketProvider): Promise<number> {
    return provider.getBlockNumber();
  }

  getRpcUrl(chainId: string): string {
    return this.configService.get<string>(`${chainId.toUpperCase()}_RPC_URL`);
  }
} 