export interface TransferEvent {
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  transactionHash: string;
  timestamp?: number;
}

export interface TransferStats {
  totalTransfers: number;
  totalVolume: string;
  uniqueSenders: number;
  uniqueReceivers: number;
  averageTransferAmount: string;
}

export interface BlockchainConfig {
  rpcUrl: string;
  contractAddress: string;
  startBlock?: number;
}

export type NetworkType = 'avalanche' 