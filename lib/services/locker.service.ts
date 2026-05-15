import type { LockerRepository } from '@/lib/repositories/interfaces/locker.repository'
import type { AllocationStrategy } from '@/lib/strategies/allocation.strategy'
import { LockerNotHeldError, HoldExpiredError } from '@/lib/errors'

const HOLD_TTL_MS = 10 * 60 * 1000

export const createLockerService = (repo: LockerRepository, strategy: AllocationStrategy) => ({
  getAllLockers:       () => repo.findAll(),
  getAvailableLockers:() => repo.findAvailable(),

  releaseExpiredHolds: () => {
    const now = Date.now()
    repo.findHeld()
      .filter(l => l.heldAt && now - l.heldAt.getTime() > HOLD_TTL_MS)
      .forEach(l => repo.update(l.id, { status: 'AVAILABLE', heldAt: null }))
  },

  holdBestFit: (w: number, h: number, d: number) => {
    const locker = strategy(w, h, d, repo.findAll())
    repo.update(locker.id, { status: 'HOLD', heldAt: new Date() })
    return repo.findById(locker.id)!
  },

  confirmOccupied: (id: string, pkgId: string) => {
    const locker = repo.findById(id)
    if (!locker || locker.status !== 'HOLD') throw new LockerNotHeldError()
    if (!locker.heldAt || Date.now() - locker.heldAt.getTime() > HOLD_TTL_MS) throw new HoldExpiredError()
    repo.update(id, { status: 'OCCUPIED', currentPackageId: pkgId, heldAt: null })
  },

  setLockerAvailable: (id: string) =>
    repo.update(id, { status: 'AVAILABLE', currentPackageId: null, heldAt: null }),
})

export type LockerService = ReturnType<typeof createLockerService>
