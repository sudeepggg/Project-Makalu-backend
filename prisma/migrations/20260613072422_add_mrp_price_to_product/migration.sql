/*
  Warnings:

  - You are about to drop the column `basePrice` on the `CustomerProductPricing` table. All the data in the column will be lost.
  - Added the required column `baseUnitPrice` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costUnitPrice` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `newBase` to the `PricingHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `newCost` to the `PricingHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `oldBase` to the `PricingHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `oldCost` to the `PricingHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerProductPricing" DROP COLUMN "basePrice",
ADD COLUMN     "baseprice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "baseUnitPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "costUnitPrice" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "PricingHistory" ADD COLUMN     "newBase" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "newCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "oldBase" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "oldCost" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "mrpPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UnitOfMeasure" ALTER COLUMN "updatedAt" DROP DEFAULT;
