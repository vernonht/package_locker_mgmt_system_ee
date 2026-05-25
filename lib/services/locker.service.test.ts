import { createLockerService } from './locker.service'
import { createInMemoryLockerRepository } from '@/lib/repositories/in-memory/locker.repository'
import { createLocker } from '@/lib/factories/locker.factory'
import { LockerNotHeldError, HoldExpiredError } from '@/lib/errors'
import type { AllocationStrategy } from '@/lib/strategies/allocation.strategy'

const makeStubs = async (seed: Parameters<typeof createLocker>[0][] = []) => {
  const repo = createInMemoryLockerRepository()
  for (const overrides of seed) await repo.save(createLocker(overrides))
  const strategy: AllocationStrategy = (_w, _h, _d, candidates) => candidates[0]
  return { repo, strategy }
}

test('getAllLockers returns all lockers', async () => {
  const { repo, strategy } = await makeStubs([{}, {}])
  const svc = createLockerService(repo, strategy)
  expect(await svc.getAllLockers()).toHaveLength(2)
})

test('getAllLockers filters by status and size', async () => {
  const { repo, strategy } = await makeStubs([
    { status: 'AVAILABLE', size: 'SMALL' },
    { status: 'AVAILABLE', size: 'MEDIUM' },
    { status: 'OCCUPIED', size: 'SMALL' },
  ])
  const svc = createLockerService(repo, strategy)

  const lockers = await svc.getAllLockers({ status: 'AVAILABLE', size: 'SMALL' })

  expect(lockers).toHaveLength(1)
  expect(lockers[0].status).toBe('AVAILABLE')
  expect(lockers[0].size).toBe('SMALL')
})

test('getAvailableLockers returns only AVAILABLE lockers', async () => {
  const { repo, strategy } = await makeStubs([{ status: 'AVAILABLE' }, { status: 'OCCUPIED' }])
  const svc = createLockerService(repo, strategy)
  expect(await svc.getAvailableLockers()).toHaveLength(1)
})

test('releaseExpiredHolds releases lockers held longer than 10 min', async () => {
  const expiredAt = new Date(Date.now() - 11 * 60 * 1000)
  const { repo, strategy } = await makeStubs([{ status: 'HOLD', heldAt: expiredAt }])
  const svc = createLockerService(repo, strategy)

  await svc.releaseExpiredHolds()

  const all = await repo.findAll()
  expect(all[0].status).toBe('AVAILABLE')
  expect(all[0].heldAt).toBeNull()
})

test('releaseExpiredHolds does not release recently held lockers', async () => {
  const { repo, strategy } = await makeStubs([{ status: 'HOLD', heldAt: new Date() }])
  const svc = createLockerService(repo, strategy)

  await svc.releaseExpiredHolds()

  const all = await repo.findAll()
  expect(all[0].status).toBe('HOLD')
})

test('holdBestFit marks locker HOLD with heldAt timestamp', async () => {
  const { repo, strategy } = await makeStubs([{ status: 'AVAILABLE' }])
  const svc = createLockerService(repo, strategy)

  const locker = await svc.holdBestFit(10, 10, 10)

  expect(locker!.status).toBe('HOLD')
  expect(locker!.heldAt).toBeInstanceOf(Date)
})

test('confirmOccupied transitions HOLD → OCCUPIED and clears heldAt', async () => {
  const locker = createLocker({ status: 'HOLD', heldAt: new Date() })
  const { repo, strategy } = await makeStubs()
  await repo.save(locker)
  const svc = createLockerService(repo, strategy)

  await svc.confirmOccupied(locker.id, 'pkg-1')

  const updated = (await repo.findById(locker.id))!
  expect(updated.status).toBe('OCCUPIED')
  expect(updated.currentPackageId).toBe('pkg-1')
  expect(updated.heldAt).toBeNull()
})

test('confirmOccupied throws LockerNotHeldError if locker is AVAILABLE', async () => {
  const locker = createLocker({ status: 'AVAILABLE' })
  const { repo, strategy } = await makeStubs()
  await repo.save(locker)
  const svc = createLockerService(repo, strategy)

  await expect(svc.confirmOccupied(locker.id, 'pkg-1')).rejects.toThrow(LockerNotHeldError)
})

test('confirmOccupied throws LockerNotHeldError if locker is OCCUPIED', async () => {
  const locker = createLocker({ status: 'OCCUPIED' })
  const { repo, strategy } = await makeStubs()
  await repo.save(locker)
  const svc = createLockerService(repo, strategy)

  await expect(svc.confirmOccupied(locker.id, 'pkg-1')).rejects.toThrow(LockerNotHeldError)
})

test('confirmOccupied throws HoldExpiredError if heldAt is older than 10 min', async () => {
  const expiredAt = new Date(Date.now() - 11 * 60 * 1000)
  const locker = createLocker({ status: 'HOLD', heldAt: expiredAt })
  const { repo, strategy } = await makeStubs()
  await repo.save(locker)
  const svc = createLockerService(repo, strategy)

  await expect(svc.confirmOccupied(locker.id, 'pkg-1')).rejects.toThrow(HoldExpiredError)
})

test('addLocker saves a new AVAILABLE locker with the given size and dimensions', async () => {
  const { repo, strategy } = await makeStubs()
  const svc = createLockerService(repo, strategy)

  const locker = await svc.addLocker({ size: 'MEDIUM', maxWidth: 50, maxHeight: 50, maxDepth: 60 })

  expect(locker.size).toBe('MEDIUM')
  expect(locker.maxWidth).toBe(50)
  expect(locker.status).toBe('AVAILABLE')
  const all = await repo.findAll()
  expect(all).toHaveLength(1)
  expect(all[0].id).toBe(locker.id)
})

test('addLocker assigns sequential lockerNumber based on existing lockers', async () => {
  const { repo, strategy } = await makeStubs([{ lockerNumber: 'L-001' }, { lockerNumber: 'L-003' }])
  const svc = createLockerService(repo, strategy)

  const locker = await svc.addLocker({ size: 'SMALL', maxWidth: 30, maxHeight: 30, maxDepth: 40 })

  expect(locker.lockerNumber).toBe('L-004')
})

test('addLocker assigns L-001 when no lockers exist', async () => {
  const { repo, strategy } = await makeStubs()
  const svc = createLockerService(repo, strategy)

  const locker = await svc.addLocker({ size: 'LARGE', maxWidth: 80, maxHeight: 80, maxDepth: 100 })

  expect(locker.lockerNumber).toBe('L-001')
})

test('setLockerAvailable clears status, currentPackageId and heldAt', async () => {
  const locker = createLocker({ status: 'OCCUPIED', currentPackageId: 'pkg-1', heldAt: new Date() })
  const { repo, strategy } = await makeStubs()
  await repo.save(locker)
  const svc = createLockerService(repo, strategy)

  await svc.setLockerAvailable(locker.id)

  const updated = (await repo.findById(locker.id))!
  expect(updated.status).toBe('AVAILABLE')
  expect(updated.currentPackageId).toBeNull()
  expect(updated.heldAt).toBeNull()
})
