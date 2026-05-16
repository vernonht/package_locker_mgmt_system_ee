import { defaultStorageChargeConfig } from '@/lib/config/storage-charges'
import type { StorageChargeConfig } from '@/lib/config/storage-charges'

export type TierBreakdown = {
  days: number
  multiplier: number
  ratePerDay: number
  subtotal: number
}

export type StorageChargeResult = {
  days: number
  totalCharge: number
  breakdown: TierBreakdown[]
  config: StorageChargeConfig
}

export const calculateStorageCharge = (
  createdAt: Date,
  now: Date = new Date(),
  config: StorageChargeConfig = defaultStorageChargeConfig,
): StorageChargeResult => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const days = Math.max(1, Math.ceil((now.getTime() - createdAt.getTime()) / MS_PER_DAY)) // round up to nearest day

  const breakdown: TierBreakdown[] = []
  let remaining = days
  let daysCounted = 0

  for (const tier of config.tiers) {
    if (remaining <= 0) break
    const tierCapacity = tier.upToDay === null ? remaining : tier.upToDay - daysCounted
    const tierDays = Math.min(remaining, tierCapacity)
    const ratePerDay = config.baseAmountPerDay * tier.multiplier
    breakdown.push({
      days: tierDays,
      multiplier: tier.multiplier,
      ratePerDay,
      subtotal: Math.round(tierDays * ratePerDay * 100) / 100,
    })
    daysCounted += tierDays
    remaining -= tierDays
  }

  const totalCharge = Math.round(breakdown.reduce((sum, t) => sum + t.subtotal, 0) * 100) / 100

  return { days, totalCharge, breakdown, config }
}
