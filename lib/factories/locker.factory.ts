import { randomUUID } from 'crypto'
import type { Locker } from '@/lib/models/locker'

let lockerNumberCounter = 1

const nextLockerNumber = () => {
  const current = lockerNumberCounter
  lockerNumberCounter += 1
  return `L-${current.toString().padStart(3, '0')}`
}

export const createLocker = (overrides?: Partial<Locker>): Locker => ({
  id:               randomUUID(),
  lockerNumber:     nextLockerNumber(),
  size:             'SMALL',
  maxWidth:         30,
  maxHeight:        30,
  maxDepth:         40,
  status:           'AVAILABLE',
  currentPackageId: null,
  heldAt:           null,
  ...overrides,
})
