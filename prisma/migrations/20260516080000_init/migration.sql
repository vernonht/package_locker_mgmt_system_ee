-- CreateTable
CREATE TABLE "lockers" (
    "id" TEXT NOT NULL,
    "lockerNumber" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "maxWidth" INTEGER NOT NULL,
    "maxHeight" INTEGER NOT NULL,
    "maxDepth" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "currentPackageId" TEXT,
    "heldAt" TIMESTAMP(3),

    CONSTRAINT "lockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,
    "pickupCodeHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "lockerId" TEXT,
    "lockerNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retrievedAt" TIMESTAMP(3),

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "lockerNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lockers_lockerNumber_key" ON "lockers"("lockerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "packages_pickupCodeHash_key" ON "packages"("pickupCodeHash");

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_lockerId_fkey" FOREIGN KEY ("lockerId") REFERENCES "lockers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
