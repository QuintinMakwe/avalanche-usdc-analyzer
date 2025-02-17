export interface AvalancheTokenConfig {
    contractAddress: string;
    decimals: number;
    symbol: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface AccountStats {
    address: string;
    tokenAddress: string;
    symbol: string;
    totalSent: string;
    totalReceived: string;
    totalVolume: string;
    transactionCount: number;
    lastActive: Date;
  }