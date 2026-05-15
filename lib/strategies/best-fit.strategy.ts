import type { Locker } from '@/lib/models/locker'
import type { AllocationStrategy } from './allocation.strategy'
import { ParcelTooLargeError, LockerUnavailableError } from '@/lib/errors'

export const bestFitByVolume: AllocationStrategy = (w, h, d, candidates) => {
  const volume = (l: Locker) => l.maxWidth * l.maxHeight * l.maxDepth
  const fitting = candidates.filter(l => l.maxWidth >= w && l.maxHeight >= h && l.maxDepth >= d)

  if (fitting.length === 0) throw new ParcelTooLargeError(`${w}×${h}×${d}`)

  const available = fitting.filter(l => l.status === 'AVAILABLE')
  if (available.length === 0) throw new LockerUnavailableError()

  return available.sort((a, b) => volume(a) - volume(b))[0]
}
