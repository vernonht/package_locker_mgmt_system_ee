import { randomUUID } from 'crypto'
import type { Locker } from '@/lib/models/locker'

export const createLocker = (overrides?: Partial<Locker>): Locker => ({
  id:               randomUUID(),
  size:             'SMALL',
  maxWidth:         30,
  maxHeight:        30,
  maxDepth:         40,
  status:           'AVAILABLE',
  currentPackageId: null,
  heldAt:           null,
  ...overrides,
})
