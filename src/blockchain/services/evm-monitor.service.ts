import { Injectable, Logger } from '@nestjs/common';
import { Contract, ethers, WebSocketProvider } from 'ethers';
import { BlockchainService } from './blockchain.service';
import {  TokenConfig, TransferEvent } from '../interfaces/blockchain.interface';
import { WebSocket } from 'ws';

@Injectable()
export abstract class EVMMonitorService {
  protected readonly logger = new Logger(this.constructor.name);
  // protected provider: ethers.providers.WebSocketProvider;
  protected provider: WebSocketProvider;
  protected contracts: Map<string, Contract> = new Map();
  protected readonly BATCH_SIZE = 2000;
  protected readonly TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
  protected readonly ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
  ];

  constructor(
    protected readonly blockchainService: BlockchainService,
    protected readonly chainId: string,
    protected readonly tokenConfigs: TokenConfig[]
  ) {
    this.initializeProvider();
  }

  protected async initializeProvider() {
    // Use WebSocket provider instead of HTTP
    const rpcUrl = this.blockchainService.getRpcUrl(this.chainId)
      .replace('https', 'wss')  // Convert HTTP to WebSocket URL
      .replace('http', 'ws');
    
    this.provider = new WebSocketProvider(rpcUrl);
    
    // Add reconnection logic
    (this.provider.websocket as WebSocket).on('close', async () => {
      console.log('WebSocket disconnected, reconnecting...');
      await this.initializeProvider();
    });

    for (const config of this.tokenConfigs) {
      const contract = this.blockchainService.createContract(
        config.address,
        this.ERC20_ABI,
        this.provider
      );
      this.contracts.set(config.address, contract);
    }
  }

  async getTransfers(fromBlock: number, toBlock: number): Promise<(TransferEvent & { tokenAddress: string, symbol: string })[]> {
    try {
      const allTransfers: (TransferEvent & { tokenAddress: string, symbol: string })[] = [];
      
      for (const [address, contract] of this.contracts.entries()) {
        const config = this.tokenConfigs.find(c => c.address === address)!;
        
        for (let currentBlock = fromBlock; currentBlock <= toBlock; currentBlock += this.BATCH_SIZE) {
          const batchToBlock = Math.min(currentBlock + this.BATCH_SIZE - 1, toBlock);
          
          const filter = {
            address: address,
            fromBlock: currentBlock,
            toBlock: batchToBlock,
            topics: [this.TRANSFER_TOPIC],
          };

          const logs = await this.blockchainService.getLogs(this.provider, filter);
          const batchTransfers = await Promise.all(
            logs.map(async (log) => {
              const parsedLog = contract.interface.parseLog(log);
              const block = await this.blockchainService.getBlock(this.provider, log.blockNumber);
              
              return {
                from: parsedLog.args.from,
                to: parsedLog.args.to,
                value: ethers.formatUnits(parsedLog.args.value, config.decimals),
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                logIndex: log.index,
                timestamp: block.timestamp,
                tokenAddress: address,
                symbol: config.symbol
              };
            })
          );
          
          allTransfers.push(...batchTransfers);
          this.logger.log(`Processed blocks ${currentBlock} to ${batchToBlock} for token ${config.symbol}`);
        }
      }

      return allTransfers;
    } catch (error) {
      this.logger.error('Error fetching transfers', error);
      throw new Error(`Failed to fetch transfers: ${error.message}`);
    }
  }

  subscribeToTransfers(callback: (transfer: TransferEvent & { tokenAddress: string, symbol: string }) => void): void {
    for (const [address, contract] of this.contracts.entries()) {
      const config = this.tokenConfigs.find(c => c.address === address)!;
      
      contract.on('Transfer', async (from, to, value, event) => {
        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
          try {
            const block = await event.getBlock();
            const transfer: TransferEvent & { tokenAddress: string, symbol: string } = {
              from,
              to,
              value: ethers.formatUnits(value, config.decimals),
              blockNumber: event.log.blockNumber,
              logIndex: event.log.index,
              transactionHash: event.log.transactionHash,
              timestamp: block.timestamp,
              tokenAddress: address,
              symbol: config.symbol
            };
            callback(transfer);
            break;

          } catch (error) {
            if (error.message?.includes('cannot query unfinalized data')) {
              attempt++;
              if (attempt === maxRetries) {
                this.logger.error(`Failed to get block data after ${maxRetries} retries`, error);
                throw error;
              }
              // Wait longer for block finalization
              const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
              this.logger.warn(`Block not finalized yet, retrying in ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw error;
            }
          }
        }
      });
      this.logger.log(`Subscribed to transfer events for token ${config.symbol} (${address})`);
    }
  }

  unsubscribeFromTransfers(): void {
    for (const [address, contract] of this.contracts.entries()) {
      contract.removeAllListeners('Transfer');
      this.logger.log(`Unsubscribed from transfer events for contract ${address}`);
    }
  }

  async getBalance(address: string, tokenAddress: string): Promise<string> {
    try {
      const contract = this.contracts.get(tokenAddress);
      if (!contract) {
        throw new Error(`No contract found for token address ${tokenAddress}`);
      }
      const config = this.tokenConfigs.find(c => c.address === tokenAddress)!;
      const balance = await contract.balanceOf(address);
      return ethers.formatUnits(balance, config.decimals);
    } catch (error) {
      this.logger.error(`Error fetching balance for address ${address}`, error);
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }
  }

  async getBatchBalances(addresses: string[], tokenAddress: string): Promise<Map<string, string>> {
    try {
      const balancePromises = addresses.map(async (address) => {
        const balance = await this.getBalance(address, tokenAddress);
        return [address, balance] as [string, string];
      });

      const balances = await Promise.all(balancePromises);
      return new Map(balances);
    } catch (error) {
      this.logger.error('Error fetching batch balances', error);
      throw new Error(`Failed to fetch batch balances: ${error.message}`);
    }
  }

  async monitorBlocks(callback: (transfers: TransferEvent[]) => void): Promise<void> {
    let lastProcessedBlock = await this.blockchainService.getLatestBlockNumber(this.provider);
    
    this.provider.on('block', async (blockNumber: number) => {
      try {
        if (blockNumber > lastProcessedBlock) {
          const transfers = await this.getTransfers(lastProcessedBlock + 1, blockNumber);
          if (transfers.length > 0) {
            callback(transfers);
          }
          lastProcessedBlock = blockNumber;
        }
      } catch (error) {
        this.logger.error(`Error processing block ${blockNumber}`, error);
      }
    });
    this.logger.log('Started block monitoring');
  }

  async getLatestBlockNumber(): Promise<number> {
    return this.blockchainService.getLatestBlockNumber(this.provider);
  }
} 