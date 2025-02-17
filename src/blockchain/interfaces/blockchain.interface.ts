import { ethers } from 'ethers';

export interface TransferEvent {
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  timestamp?: number;
}

export interface TransferStats {
  totalTransfers: number;
  totalVolume: string;
  uniqueSenders: number;
  uniqueReceivers: number;
  averageTransferAmount: string;
}

export interface EVMConfig {
  rpcUrl: string;
  chainId: string;
  contractAddress: string;
  contractABI: string[];
  decimals: number;
} 

export interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
}