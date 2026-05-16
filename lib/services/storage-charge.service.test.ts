import { calculateStorageCharge } from './storage-charge.service'
import { defaultStorageChargeConfig } from '@/lib/config/storage-charges'
import type { StorageChargeConfig } from '@/lib/config/storage-charges'

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

test('1 day: charges 1x base', () => {
  const result = calculateStorageCharge(daysAgo(1))
  expect(result.totalCharge).toBeCloseTo(0.50)
  expect(result.days).toBe(1)
})

test('5 days: charges 5 × 1x base', () => {
  const result = calculateStorageCharge(daysAgo(5))
  expect(result.totalCharge).toBeCloseTo(2.50)
})

test('6 days: first 5 at 1x, day 6 at 2x', () => {
  const result = calculateStorageCharge(daysAgo(6))
  // 5×0.50 + 1×1.00 = 3.50
  expect(result.totalCharge).toBeCloseTo(3.50)
})

test('10 days: 5×1x + 5×2x', () => {
  const result = calculateStorageCharge(daysAgo(10))
  // 5×0.50 + 5×1.00 = 7.50
  expect(result.totalCharge).toBeCloseTo(7.50)
})

test('12 days: 5×1x + 5×2x + 2×3x', () => {
  const result = calculateStorageCharge(daysAgo(12))
  // 5×0.50 + 5×1.00 + 2×1.50 = 2.50 + 5.00 + 3.00 = 10.50
  expect(result.totalCharge).toBeCloseTo(10.50)
})

test('returns a breakdown per tier', () => {
  const result = calculateStorageCharge(daysAgo(12))
  expect(result.breakdown).toHaveLength(3)
  expect(result.breakdown[0]).toMatchObject({ days: 5, multiplier: 1, subtotal: 2.50 })
  expect(result.breakdown[1]).toMatchObject({ days: 5, multiplier: 2, subtotal: 5.00 })
  expect(result.breakdown[2]).toMatchObject({ days: 2, multiplier: 3, subtotal: 3.00 })
})

test('custom config: higher base amount', () => {
  const config: StorageChargeConfig = {
    baseAmountPerDay: 1.00,
    tiers: [
      { upToDay: 3,    multiplier: 1 },
      { upToDay: null, multiplier: 2 },
    ],
  }
  const result = calculateStorageCharge(daysAgo(5), new Date(), config)
  // 3×1.00 + 2×2.00 = 3.00 + 4.00 = 7.00
  expect(result.totalCharge).toBeCloseTo(7.00)
})

test('custom config: different multipliers', () => {
  const config: StorageChargeConfig = {
    baseAmountPerDay: 0.50,
    tiers: [
      { upToDay: 5,    multiplier: 1 },
      { upToDay: 10,   multiplier: 4 },  // 4x instead of 2x
      { upToDay: null, multiplier: 6 },
    ],
  }
  const result = calculateStorageCharge(daysAgo(6), new Date(), config)
  // 5×0.50 + 1×2.00 = 2.50 + 2.00 = 4.50
  expect(result.totalCharge).toBeCloseTo(4.50)
})

test('accepts explicit now for deterministic testing', () => {
  const createdAt = new Date('2026-01-01T00:00:00Z')
  const now       = new Date('2026-01-08T00:00:00Z')  // exactly 7 days
  const result = calculateStorageCharge(createdAt, now)
  // 5×0.50 + 2×1.00 = 4.50
  expect(result.totalCharge).toBeCloseTo(4.50)
  expect(result.days).toBe(7)
})

test('minimum charge is 1 day even if stored less than 24h', () => {
  const result = calculateStorageCharge(new Date())
  expect(result.days).toBe(1)
  expect(result.totalCharge).toBeCloseTo(0.50)
})

test('uses defaultStorageChargeConfig when no config provided', () => {
  const result = calculateStorageCharge(daysAgo(1))
  expect(result.config).toEqual(defaultStorageChargeConfig)
})
