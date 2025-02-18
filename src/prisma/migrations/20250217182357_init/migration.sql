/*
  Warnings:

  - The `totalSent` column on the `AddressStats` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `totalReceived` column on the `AddressStats` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AddressStats" DROP COLUMN "totalSent",
ADD COLUMN     "totalSent" DECIMAL(65,30) NOT NULL DEFAULT 0,
DROP COLUMN "totalReceived",
ADD COLUMN     "totalReceived" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AddressStats_totalSent_idx" ON "AddressStats"("totalSent");

-- CreateIndex
CREATE INDEX "AddressStats_totalReceived_idx" ON "AddressStats"("totalReceived");
