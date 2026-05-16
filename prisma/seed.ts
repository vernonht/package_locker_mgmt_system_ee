import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { createLocker } from '../lib/factories/locker.factory'
import { defaultStorageChargeConfig } from '../lib/config/storage-charges'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const SEED = [
  ...Array(5).fill({ size: 'SMALL',  maxWidth: 30, maxHeight: 30, maxDepth: 40  }),
  ...Array(5).fill({ size: 'MEDIUM', maxWidth: 50, maxHeight: 50, maxDepth: 60  }),
  ...Array(2).fill({ size: 'LARGE',  maxWidth: 80, maxHeight: 80, maxDepth: 100 }),
] as Parameters<typeof createLocker>[0][]

async function main() {
  await prisma.locker.deleteMany()
  await prisma.package.deleteMany()
  await prisma.notificationLog.deleteMany()

  for (const overrides of SEED) {
    const locker = createLocker(overrides)
    await prisma.locker.create({
      data: {
        id:           locker.id,
        lockerNumber: locker.lockerNumber,
        size:         locker.size,
        maxWidth:     locker.maxWidth,
        maxHeight:    locker.maxHeight,
        maxDepth:     locker.maxDepth,
        status:       locker.status,
      },
    })
  }

  console.log('Seeded 12 lockers (5 SMALL, 5 MEDIUM, 2 LARGE)')

  await prisma.storageChargeTier.deleteMany()
  await prisma.storageChargeConfig.deleteMany()

  await prisma.storageChargeConfig.create({
    data: {
      baseAmountPerDay: defaultStorageChargeConfig.baseAmountPerDay,
      tiers: {
        create: defaultStorageChargeConfig.tiers.map((t, i) => ({
          upToDay:    t.upToDay,
          multiplier: t.multiplier,
          sortOrder:  i,
        })),
      },
    },
  })

  console.log('Seeded storage charge config (base $0.50, tiers: 1×/2×/3×)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
