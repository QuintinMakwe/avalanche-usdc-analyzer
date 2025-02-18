# Avalanche USDC Transfer Monitor

A service that monitors and indexes USDC transfers on the Avalanche network, providing real-time tracking and historical data analysis.

## Setup Instructions

### Prerequisites
- Node.js (v20+)
- PostgreSQL
- Redis
- Avalanche RPC endpoint

### Environment Variables

```env
# Blockchain RPC Configuration
AVALANCHE_RPC_URL="https://rpc.ankr.com/avalanche/YOUR_API_KEY"
AVALANCHE_NETWORK=mainnet

# Redis Configuration
REDIS_PASSWORD=your_redis_password
REDIS_HOST=redis
REDIS_PORT=6390

# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DATABASE=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DATABASE}

# API Configuration
PORT=3000
```

### Installation

```bash
# Start the services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app
```

## API Documentation

### Endpoints

#### 1. Get Transfer Statistics

```http
GET /avalanche/transfer-stats
```

Query Parameters:
- `startTime` (ISO Date) - Start time for statistics
- `endTime` (ISO Date) - End time for statistics
- `tokenAddress` (string, optional) - Token address (defaults to USDC)
- `page` (number, optional) - Page number
- `limit` (number, optional) - Items per page

Response:
```json
{
    "data": {
        "stats": {
            "totalTransfers": "1000",
            "totalVolume": "5000000000000",
            "uniqueAddresses": "350",
            "averageAmount": "5000000000"
        }
    },
    "message": "Transfer statistics fetched successfully",
    "status": "success"
}
```

#### 2. Get Top Accounts

```http
GET /avalanche/top-accounts
```

Query Parameters:
- `startTime` (ISO Date) - Start time for statistics
- `endTime` (ISO Date) - End time for statistics
- `tokenAddress` (string, optional) - Token address (defaults to USDC)
- `page` (number, optional) - Page number
- `limit` (number, optional) - Items per page

Response:
```json
{
    "data": {
        "accounts": [
            {
                "address": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
                "tokenAddress": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
                "symbol": "USDC",
                "totalSent": "1000000000000",
                "totalReceived": "2000000000000",
                "transactionCount": 50,
                "lastActive": "2024-03-19T10:30:00Z"
            }
        ]
    },
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 100,
        "pages": 10
    },
    "message": "Top accounts fetched successfully",
    "status": "success"
}
```

#### 3. Get Transfers

```http
GET /avalanche/transfers
```

Query Parameters:
- `startTime` (ISO Date) - Start time for transfers
- `endTime` (ISO Date) - End time for transfers
- `tokenAddress` (string, optional) - Token address (defaults to USDC)
- `page` (number, optional) - Page number
- `limit` (number, optional) - Items per page

Response:
```json
{
    "data": {
        "transfers": [
            {
                "transactionHash": "0x123...",
                "blockNumber": "12345678",
                "fromAddress": "0xabc...",
                "toAddress": "0xdef...",
                "amount": "1000000000",
                "timestamp": "2024-03-19T10:30:00Z",
                "tokenAddress": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
                "symbol": "USDC"
            }
        ]
    },
    "pagination": {
        "page": 1,
        "limit": 10,
        "total": 1000,
        "pages": 100
    },
    "message": "Transfers fetched successfully",
    "status": "success"
}
```

## Architecture Overview

### System Components

```mermaid
graph TD
    A[Monitor Service] -->|Subscribe to Events| B[Blockchain]
    A -->|Transfer Events| C[Indexer Service]
    C -->|Store State| D[(Redis)]
    C -->|Store Data| E[(PostgreSQL)]
    F[Aggregation Service] -->|Query Data| E
    G[API Layer] -->|Request Stats| F
    G -->|Response| H[Client]
```

### Indexing Process

```mermaid
graph TD
    A[Server Start] --> B{Last Block in Redis?}
    B -->|Yes| C[Start Catch-up Process]
    B -->|No| D[Start Fresh Monitoring]
    C --> E[Historical Indexing]
    D --> F[Real-time Subscription]
    C --> F
    E -->|Updates| G[(Redis)]
    F -->|Updates| G
    H[Transfer Event] --> I{Already Indexed?}
    I -->|Yes| J[Skip]
    I -->|No| K[Index Transfer]
    K --> L[Update Last Block]
    L --> G
```

### Data Flow
1. Monitor Service subscribes to transfer events
2. Transfer events are sent to Indexer Service
3. Indexer Service stores transfers in PostgreSQL
4. Indexer Service maintains state in Redis
5. Aggregation Service queries PostgreSQL for analytics
6. API Layer serves client requests through Aggregation Service

However, the monitoring service could be better designed to be completely fault tolerant and scalable. Below is a diagram of the monitoring service with more time, would be ideal to implement. 

### Indexing Architecture 

```mermaid
graph TD
    A[Server Start] --> B{Last Block in Redis?}
    B -->|Yes| C[Start Catch-up Process]
    B -->|No| D[Start Fresh Monitoring]
    
    C --> E[Historical Indexing]
    D --> F[Real-time Subscription]
    C --> F
    
    E -->|Updates| G[(Redis)]
    F -->|Updates| G
    
    H[Transfer Event] --> I{Already Indexed?}
    I -->|Yes| J[Skip]
    I -->|No| K[Index Transfer]
    K --> L[Update Last Block]
    L --> G
```

### Technologies Used
- NestJS (Backend Framework)
- Prisma (ORM)
- PostgreSQL (Primary Database)
- Redis (State Management)
- ethers.js (Blockchain Interaction)

## Database Schema

### TokenTransfer

```sql
CREATE TABLE TokenTransfer (
   "id" TEXT PRIMARY KEY,
    "transactionHash" TEXT UNIQUE,
    "blockNumber" BIGINT,
    "fromAddress" TEXT,
    "toAddress" TEXT,
    "amount" TEXT,
    "timestamp" TIMESTAMP,
    "tokenAddress" TEXT,
    "symbol" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP   
);

CREATE INDEX "fromAddress_idx" ON "TokenTransfer"("fromAddress");
CREATE INDEX "toAddress_idx" ON "TokenTransfer"("toAddress");
CREATE INDEX "tokenAddress_idx" ON "TokenTransfer"("tokenAddress");
```

### AddressTokenStats

```sql
CREATE TABLE AddressTokenStats (
    "address" TEXT,
    "tokenAddress" TEXT,
    "symbol" TEXT,
    "totalSent" TEXT,
    "totalReceived" TEXT,
    "transactionCount" INTEGER,
    "lastActive" TIMESTAMP,
    PRIMARY KEY ("address", "tokenAddress")
);
```


## Monitoring/Indexing Process

### Real-time Monitoring
- Subscribes to transfer events using WebSocket
- Processes transfers immediately
- Updates address statistics atomically
- Records last indexed block

### Catch-up Mechanism(Not Implemented)
- Runs parallel to real-time monitoring
- Processes historical blocks in batches
- Handles duplicates through database constraints
- Updates block checkpoint atomically

### Block Tracking(Not Implemented)
- Redis maintains last indexed block
- Atomic updates prevent race conditions
- Supports system recovery after downtime

## Error Handling

### Types of Errors Handled
1. Network Issues
   - RPC connection failures
   - Redis connection losses
   - Database connectivity problems

2. Data Integrity
   - Duplicate transactions
   - Block reorganizations
   - Invalid transfer data

3. System Errors
   - Out of memory
   - Process crashes
   - Timeout issues

### Recovery Mechanisms
- Automatic reconnection to services
- Transaction rollbacks
- Idempotent processing
- Batch retry logic


## Testing

### Running Tests

```bash
npm test

This will run tests for:
- avalanche-aggregation.service.spec.ts (Aggregation service tests)
- avalanche-analytics.controller.spec.ts (Analytics controller tests)
- evm-monitor.service.spec.ts (EVM monitoring tests)f
```

### Test Coverage
- **Aggregation Service Tests**
  - Token transfer statistics calculation
  - Top accounts aggregation
  - Pagination handling
  
- **Analytics Controller Tests**
  - API endpoint validation
  - Response formatting
  - Query parameter handling

- **EVM Monitor Tests**
  - Event subscription handling
  - Transfer event processing
  - Block monitoring

## Performance Considerations

### Scalability
- Horizontal scaling through stateless design
- Redis for distributed state
- Batch processing for efficiency

### Possible Optimizations
- Indexed database queries
- Caching of frequent calculations
- Efficient blockchain event filtering

### Bottlenecks
- RPC rate limits
- Database write capacity
- Memory usage during catch-up

### Monitoring
- System metrics tracking
- Performance logging
- Error rate monitoring

Deployed Application base URL: http://138.199.145.47:3000 - Hosted on a Hetzner server. 