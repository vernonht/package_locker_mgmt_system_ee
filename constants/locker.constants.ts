import type { LockerSize } from '@/lib/models/locker'

export const LOCKER_STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-green-100  border-green-400  text-green-800',
  HOLD: 'bg-blue-100   border-blue-400   text-blue-800',
  OCCUPIED: 'bg-amber-100  border-amber-400  text-amber-800',
  OUT_OF_ORDER: 'bg-red-100    border-red-400    text-red-800',
}

export const LOCKER_SIZE_PRESETS: Record<LockerSize, { maxWidth: number; maxHeight: number; maxDepth: number }> = {
  SMALL: { maxWidth: 30, maxHeight: 30, maxDepth: 40 },
  MEDIUM: { maxWidth: 50, maxHeight: 50, maxDepth: 60 },
  LARGE: { maxWidth: 80, maxHeight: 80, maxDepth: 100 },
}

export const HOLD_DURATION_MS = 10 * 60 * 1000
