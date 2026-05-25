import type { Locker } from '@/lib/models/locker'
import type { AllocationStrategy } from './allocation.strategy'
import { ParcelTooLargeError, LockerUnavailableError } from '@/lib/errors'

export const bestFitByVolume: AllocationStrategy = (w, h, d, availableLockers) => {
  if (availableLockers.length === 0) throw new LockerUnavailableError()

  let sawDimensionFit = false
  let best: Locker | null = null
  let bestVolume = Number.POSITIVE_INFINITY

  // Single-pass scan avoids creating/sorting large arrays for very large locker pools.
  for (const locker of availableLockers) {
    const fitsDimensions = locker.maxWidth >= w && locker.maxHeight >= h && locker.maxDepth >= d
    if (!fitsDimensions) continue

    sawDimensionFit = true
    if (locker.status !== 'AVAILABLE') continue

    const volume = locker.maxWidth * locker.maxHeight * locker.maxDepth
    if (volume < bestVolume) {
      best = locker
      bestVolume = volume
    }
  }

  if (best) return best
  if (sawDimensionFit) throw new LockerUnavailableError()
  throw new ParcelTooLargeError(`${w}×${h}×${d}`)
}