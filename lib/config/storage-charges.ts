export type ChargeTier = {
  upToDay: number | null  // null = unlimited (final tier)
  multiplier: number
}

export type StorageChargeConfig = {
  baseAmountPerDay: number
  tiers: ChargeTier[]
}

export const defaultStorageChargeConfig: StorageChargeConfig = {
  baseAmountPerDay: 0.50,
  tiers: [
    { upToDay: 5,    multiplier: 1 },  // days 1–5:  $0.50/day
    { upToDay: 10,   multiplier: 2 },  // days 6–10: $1.00/day
    { upToDay: null, multiplier: 3 },  // days 11+:  $1.50/day
  ],
}
