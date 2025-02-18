-- CreateTable
CREATE TABLE "TokenTransfer" (
    "id" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressTokenStats" (
    "address" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "totalSent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalReceived" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddressTokenStats_pkey" PRIMARY KEY ("address","tokenAddress")
);

-- CreateTable
CREATE TABLE "AddressStats" (
    "address" TEXT NOT NULL,
    "totalSent" TEXT NOT NULL,
    "totalReceived" TEXT NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddressStats_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "BlockCheckpoint" (
    "id" TEXT NOT NULL,
    "lastBlock" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "TokenTransfer_fromAddress_idx" ON "TokenTransfer"("fromAddress");

-- CreateIndex
CREATE INDEX "TokenTransfer_toAddress_idx" ON "TokenTransfer"("toAddress");

-- CreateIndex
CREATE INDEX "TokenTransfer_tokenAddress_idx" ON "TokenTransfer"("tokenAddress");

-- CreateIndex
CREATE UNIQUE INDEX "TokenTransfer_transactionHash_logIndex_key" ON "TokenTransfer"("transactionHash", "logIndex");

-- CreateIndex
CREATE INDEX "AddressTokenStats_tokenAddress_idx" ON "AddressTokenStats"("tokenAddress");

-- CreateIndex
CREATE INDEX "AddressStats_totalSent_idx" ON "AddressStats"("totalSent");

-- CreateIndex
CREATE INDEX "AddressStats_totalReceived_idx" ON "AddressStats"("totalReceived");

-- CreateIndex
CREATE INDEX "AddressStats_transactionCount_idx" ON "AddressStats"("transactionCount");
