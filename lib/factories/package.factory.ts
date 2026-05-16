import { randomUUID } from 'crypto'
import type { Package } from '@/lib/models/package'

export const createPackage = (overrides?: Partial<Package>): Package => ({
  id: randomUUID(),
  recipientName: '',
  recipientPhone: '',
  width: 0,
  height: 0,
  depth: 0,
  pickupCodeHash: '',
  status: 'PENDING_DEPOSIT',
  lockerId: null,
  lockerNumber: null,
  createdAt: new Date(),
  retrievedAt: null,
  ...overrides,
})
