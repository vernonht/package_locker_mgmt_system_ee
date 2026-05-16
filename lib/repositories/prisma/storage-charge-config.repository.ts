import type { PrismaClient } from '@/lib/generated/prisma/client'
import type { StorageChargeConfig } from '@/lib/config/storage-charges'
import type { StorageChargeConfigRepository } from '@/lib/repositories/interfaces/storage-charge-config.repository'

export const createPrismaStorageChargeConfigRepository = (prisma: PrismaClient): StorageChargeConfigRepository => ({
  getActive: async () => {
    const row = await prisma.storageChargeConfig.findFirst({
      include: { tiers: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!row) return null
    return {
      baseAmountPerDay: row.baseAmountPerDay,
      tiers: row.tiers.map(t => ({
        upToDay:    t.upToDay,
        multiplier: t.multiplier,
      })),
    } satisfies StorageChargeConfig
  },
})
