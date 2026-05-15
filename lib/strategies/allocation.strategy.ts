import type { Locker } from '@/lib/models/locker'

export type AllocationStrategy = (
  width: number,
  height: number,
  depth: number,
  candidates: Locker[],
) => Locker
