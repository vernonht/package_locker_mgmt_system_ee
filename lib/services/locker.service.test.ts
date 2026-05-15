import { createLockerService } from './locker.service'
import { createInMemoryLockerRepository } from '@/lib/repositories/in-memory/locker.repository'
import { createLocker } from '@/lib/factories/locker.factory'
import { LockerNotHeldError, HoldExpiredError } from '@/lib/errors'
import type { AllocationStrategy } from '@/lib/strategies/allocation.strategy'

const makeStubs = (seed: Parameters<typeof createLocker>[0][] = []) => {
  const repo = createInMemoryLockerRepository()
  seed.forEach(overrides => repo.save(createLocker(overrides)))
  const strategy: AllocationStrategy = (_w, _h, _d, candidates) => candidates[0]
  return { repo, strategy }
}

test('getAllLockers returns all lockers', () => {
  const { repo, strategy } = makeStubs([{}, {}])
  const svc = createLockerService(repo, strategy)
  expect(svc.getAllLockers()).toHaveLength(2)
})

test('getAvailableLockers returns only AVAILABLE lockers', () => {
  const { repo, strategy } = makeStubs([{ status: 'AVAILABLE' }, { status: 'OCCUPIED' }])
  const svc = createLockerService(repo, strategy)
  expect(svc.getAvailableLockers()).toHaveLength(1)
})

test('releaseExpiredHolds releases lockers held longer than 10 min', () => {
  const expiredAt = new Date(Date.now() - 11 * 60 * 1000)
  const { repo, strategy } = makeStubs([{ status: 'HOLD', heldAt: expiredAt }])
  const svc = createLockerService(repo, strategy)

  svc.releaseExpiredHolds()

  expect(repo.findAll()[0].status).toBe('AVAILABLE')
  expect(repo.findAll()[0].heldAt).toBeNull()
})

test('releaseExpiredHolds does not release recently held lockers', () => {
  const { repo, strategy } = makeStubs([{ status: 'HOLD', heldAt: new Date() }])
  const svc = createLockerService(repo, strategy)

  svc.releaseExpiredHolds()

  expect(repo.findAll()[0].status).toBe('HOLD')
})

test('holdBestFit marks locker HOLD with heldAt timestamp', () => {
  const { repo, strategy } = makeStubs([{ status: 'AVAILABLE' }])
  const svc = createLockerService(repo, strategy)

  const locker = svc.holdBestFit(10, 10, 10)

  expect(locker.status).toBe('HOLD')
  expect(locker.heldAt).toBeInstanceOf(Date)
})

test('confirmOccupied transitions HOLD → OCCUPIED and clears heldAt', () => {
  const locker = createLocker({ status: 'HOLD', heldAt: new Date() })
  const { repo, strategy } = makeStubs()
  repo.save(locker)
  const svc = createLockerService(repo, strategy)

  svc.confirmOccupied(locker.id, 'pkg-1')

  const updated = repo.findById(locker.id)!
  expect(updated.status).toBe('OCCUPIED')
  expect(updated.currentPackageId).toBe('pkg-1')
  expect(updated.heldAt).toBeNull()
})

test('confirmOccupied throws LockerNotHeldError if locker is AVAILABLE', () => {
  const locker = createLocker({ status: 'AVAILABLE' })
  const { repo, strategy } = makeStubs()
  repo.save(locker)
  const svc = createLockerService(repo, strategy)

  expect(() => svc.confirmOccupied(locker.id, 'pkg-1')).toThrow(LockerNotHeldError)
})

test('confirmOccupied throws LockerNotHeldError if locker is OCCUPIED', () => {
  const locker = createLocker({ status: 'OCCUPIED' })
  const { repo, strategy } = makeStubs()
  repo.save(locker)
  const svc = createLockerService(repo, strategy)

  expect(() => svc.confirmOccupied(locker.id, 'pkg-1')).toThrow(LockerNotHeldError)
})

test('confirmOccupied throws HoldExpiredError if heldAt is older than 10 min', () => {
  const expiredAt = new Date(Date.now() - 11 * 60 * 1000)
  const locker = createLocker({ status: 'HOLD', heldAt: expiredAt })
  const { repo, strategy } = makeStubs()
  repo.save(locker)
  const svc = createLockerService(repo, strategy)

  expect(() => svc.confirmOccupied(locker.id, 'pkg-1')).toThrow(HoldExpiredError)
})

test('setLockerAvailable clears status, currentPackageId and heldAt', () => {
  const locker = createLocker({ status: 'OCCUPIED', currentPackageId: 'pkg-1', heldAt: new Date() })
  const { repo, strategy } = makeStubs()
  repo.save(locker)
  const svc = createLockerService(repo, strategy)

  svc.setLockerAvailable(locker.id)

  const updated = repo.findById(locker.id)!
  expect(updated.status).toBe('AVAILABLE')
  expect(updated.currentPackageId).toBeNull()
  expect(updated.heldAt).toBeNull()
})
