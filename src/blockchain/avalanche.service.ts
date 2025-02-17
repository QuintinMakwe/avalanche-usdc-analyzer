import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain.service';

interface TransferEvent {
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  transactionHash: string;
  timestamp?: number;
}

interface TransferStats {
  totalTransfers: number;
  totalVolume: string;
  uniqueSenders: number;
  uniqueReceivers: number;
  averageTransferAmount: string;
}

@Injectable()
export class AvalancheService {
  private readonly logger = new Logger(AvalancheService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly usdcContract: ethers.Contract;
  
  // Avalanche USDC contract details
  private readonly USDC_CONTRACT_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
  private readonly TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
  private readonly USDC_DECIMALS = 6;
  
  private readonly USDC_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
  ];

  constructor(private readonly blockchainService: BlockchainService) {
    this.provider = this.blockchainService.getProvider('avalanche');
    this.usdcContract = this.blockchainService.createContract(
      this.USDC_CONTRACT_ADDRESS,
      this.USDC_ABI,
      this.provider
    );
    this.logger.log('Initialized Avalanche USDC service');
  }

  async getUSDCTransfers(fromBlock: number, toBlock: number): Promise<TransferEvent[]> {
    try {
      const filter = {
        address: this.USDC_CONTRACT_ADDRESS,
        fromBlock,
        toBlock,
        topics: [this.TRANSFER_TOPIC],
      };

      const logs = await this.blockchainService.getLogs(this.provider, filter);
      const transferPromises = logs.map(async (log) => {
        const parsedLog = this.usdcContract.interface.parseLog(log);
        const block = await this.blockchainService.getBlock(this.provider, log.blockNumber);

        return {
          from: parsedLog.args.from,
          to: parsedLog.args.to,
          value: ethers.formatUnits(parsedLog.args.value, this.USDC_DECIMALS),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp: block.timestamp
        };
      });

      const transfers = await Promise.all(transferPromises);
      this.logger.log(`Fetched ${transfers.length} USDC transfer events`);
      return transfers;
    } catch (error) {
      this.logger.error('Error fetching USDC transfers', error);
      throw new Error(`Failed to fetch USDC transfers: ${error.message}`);
    }
  }

  async getTransferStats(fromBlock: number, toBlock: number): Promise<TransferStats> {
    try {
      const transfers = await this.getUSDCTransfers(fromBlock, toBlock);
      
      const uniqueSenders = new Set(transfers.map(t => t.from));
      const uniqueReceivers = new Set(transfers.map(t => t.to));
      
      const totalVolume = transfers.reduce(
        (sum, transfer) => sum + BigInt(ethers.parseUnits(transfer.value, this.USDC_DECIMALS)),
        BigInt(0)
      );
      
      const averageTransfer = transfers.length > 0
        ? ethers.formatUnits(totalVolume / BigInt(transfers.length), this.USDC_DECIMALS)
        : '0';

      return {
        totalTransfers: transfers.length,
        totalVolume: ethers.formatUnits(totalVolume, this.USDC_DECIMALS),
        uniqueSenders: uniqueSenders.size,
        uniqueReceivers: uniqueReceivers.size,
        averageTransferAmount: averageTransfer
      };
    } catch (error) {
      this.logger.error('Error calculating transfer stats', error);
      throw new Error(`Failed to calculate transfer stats: ${error.message}`);
    }
  }

  async getUSDCBalance(address: string): Promise<string> {
    try {
      const balance = await this.usdcContract.balanceOf(address);
      return ethers.formatUnits(balance, this.USDC_DECIMALS);
    } catch (error) {
      this.logger.error(`Error fetching USDC balance for address ${address}`, error);
      throw new Error(`Failed to fetch USDC balance: ${error.message}`);
    }
  }

  subscribeToTransfers(callback: (transfer: TransferEvent) => void): void {
    this.usdcContract.on('Transfer', async (from, to, value, event) => {
      try {
        const block = await this.blockchainService.getBlock(this.provider, event.blockNumber);
        const transfer: TransferEvent = {
          from,
          to,
          value: ethers.formatUnits(value, this.USDC_DECIMALS),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          timestamp: block.timestamp
        };
        callback(transfer);
      } catch (error) {
        this.logger.error('Error processing transfer event', error);
      }
    });
  }

  async getLatestBlockNumber(): Promise<number> {
    return this.blockchainService.getLatestBlockNumber(this.provider);
  }

  /**
   * Unsubscribe from transfer events
   */
  unsubscribeFromTransfers(): void {
    this.usdcContract.removeAllListeners('Transfer');
    this.logger.log('Unsubscribed from USDC transfer events');
  }

  /**
   * Get multiple account balances in a single call
   */
  async getBatchUSDCBalances(addresses: string[]): Promise<Map<string, string>> {
    try {
      const balancePromises = addresses.map(async (address) => {
        const balance = await this.getUSDCBalance(address);
        return [address, balance] as [string, string];
      });

      const balances = await Promise.all(balancePromises);
      return new Map(balances);
    } catch (error) {
      this.logger.error('Error fetching batch USDC balances', error);
      throw new Error(`Failed to fetch batch USDC balances: ${error.message}`);
    }
  }
}
