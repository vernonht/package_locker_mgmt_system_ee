-- CreateTable
CREATE TABLE "storage_charge_configs" (
    "id" TEXT NOT NULL,
    "baseAmountPerDay" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_charge_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_charge_tiers" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "upToDay" INTEGER,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "storage_charge_tiers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "storage_charge_tiers" ADD CONSTRAINT "storage_charge_tiers_configId_fkey" FOREIGN KEY ("configId") REFERENCES "storage_charge_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
