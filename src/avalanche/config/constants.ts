import { EVMConfig } from '../../blockchain/interfaces/blockchain.interface';

export const AVALANCHE_CONFIG: EVMConfig = {
  rpcUrl: process.env.AVALANCHE_RPC_URL || '',
  chainId: 'avalanche',
  contractAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  contractABI: [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'event Transfer(address indexed from, address indexed to, uint256 value)'
  ],
  decimals: 6
}; 

export const REDIS_KEYS = {
  MONITORING_STATE: 'avalanche:monitoring:state',
  LAST_INDEXED_BLOCK: 'avalanche:indexer:lastBlock',
  CATCH_UP_STATE: 'avalanche:indexer:catchingUp',
} as const;