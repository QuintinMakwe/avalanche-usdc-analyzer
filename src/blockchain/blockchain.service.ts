import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get or create a provider for a specific network
   */
  getProvider(network: string, rpcUrl?: string): ethers.JsonRpcProvider {
    if (!this.providers.has(network)) {
      const url = rpcUrl || this.configService.get<string>(`${network.toUpperCase()}_RPC_URL`);
      if (!url) {
        throw new Error(`No RPC URL configured for network: ${network}`);
      }
      
      const provider = new ethers.JsonRpcProvider(url);
      this.providers.set(network, provider);
      this.logger.log(`Created new provider for network: ${network}`);
    }
    
    return this.providers.get(network)!;
  }

  /**
   * Create a contract instance
   */
  createContract(
    address: string,
    abi: ethers.InterfaceAbi,
    provider: ethers.JsonRpcProvider
  ): ethers.Contract {
    return new ethers.Contract(address, abi, provider);
  }

  /**
   * Get logs for a specific filter
   */
  async getLogs(
    provider: ethers.JsonRpcProvider,
    filter: ethers.Filter
  ): Promise<ethers.Log[]> {
    try {
      return await provider.getLogs(filter);
    } catch (error) {
      this.logger.error('Error fetching logs', error);
      throw new Error(`Failed to fetch logs: ${error.message}`);
    }
  }

  /**
   * Get latest block number
   */
  async getLatestBlockNumber(provider: ethers.JsonRpcProvider): Promise<number> {
    try {
      return await provider.getBlockNumber();
    } catch (error) {
      this.logger.error('Error fetching latest block number', error);
      throw new Error(`Failed to fetch latest block number: ${error.message}`);
    }
  }

  /**
   * Get block by number
   */
  async getBlock(
    provider: ethers.JsonRpcProvider,
    blockNumber: number
  ): Promise<ethers.Block> {
    try {
      return await provider.getBlock(blockNumber);
    } catch (error) {
      this.logger.error(`Error fetching block ${blockNumber}`, error);
      throw new Error(`Failed to fetch block: ${error.message}`);
    }
  }
}