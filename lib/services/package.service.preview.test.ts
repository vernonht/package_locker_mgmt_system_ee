import { createPackageService } from './package.service'
import { createInMemoryPackageRepository } from '@/lib/repositories/in-memory/package.repository'
import { createPackage } from '@/lib/factories/package.factory'
import { createLocker } from '@/lib/factories/locker.factory'
import { InvalidCodeError } from '@/lib/errors'
import type { LockerService } from './locker.service'
import type { NotificationService } from './notification.service'
import { hashCode } from './code.service'

const makeStubs = () => {
  const packageRepo = createInMemoryPackageRepository()
  const lockers = [createLocker({ id: 'locker-1', lockerNumber: 'L-001' })]

  const lockerService: LockerService = {
    getAllLockers:        () => Promise.resolve(lockers),
    getAvailableLockers: () => Promise.resolve([]),
    releaseExpiredHolds: () => Promise.resolve(),
    holdBestFit:         () => Promise.resolve(createLocker()),
    confirmOccupied:     () => Promise.resolve(),
    setLockerAvailable:  () => Promise.resolve(),
  }

  const notificationService: NotificationService = {
    send: () => Promise.resolve(),
  }

  const svc = createPackageService(lockerService, packageRepo, notificationService)
  return { svc, packageRepo }
}

const CODE = 'A3F9C1'

test('previewPickup returns charge and lockerNumber for a STORED package', async () => {
  const { svc, packageRepo } = makeStubs()
  const createdAt = new Date('2026-05-13T00:00:00.000Z')
  const now       = new Date('2026-05-16T00:00:00.000Z') // 3 days later
  await packageRepo.save(createPackage({
    pickupCodeHash: hashCode(CODE),
    status: 'STORED',
    lockerId: 'locker-1',
    lockerNumber: 'L-001',
    createdAt,
  }))

  const preview = await svc.previewPickup(CODE, now)

  expect(preview.days).toBe(3)
  expect(preview.totalCharge).toBe(1.50)  // 3 days × $0.50
  expect(preview.lockerNumber).toBe('L-001')
  expect(preview.breakdown).toHaveLength(1)
})

test('previewPickup throws InvalidCodeError for unknown code', async () => {
  const { svc } = makeStubs()
  await expect(svc.previewPickup('FFFFFF')).rejects.toThrow(InvalidCodeError)
})

test('previewPickup throws InvalidCodeError for RETRIEVED package', async () => {
  const { svc, packageRepo } = makeStubs()
  await packageRepo.save(createPackage({
    pickupCodeHash: hashCode(CODE),
    status: 'RETRIEVED',
    lockerId: 'locker-1',
    lockerNumber: 'L-001',
  }))

  await expect(svc.previewPickup(CODE)).rejects.toThrow(InvalidCodeError)
})

test('previewPickup does NOT change package status', async () => {
  const { svc, packageRepo } = makeStubs()
  await packageRepo.save(createPackage({
    pickupCodeHash: hashCode(CODE),
    status: 'STORED',
    lockerId: 'locker-1',
    lockerNumber: 'L-001',
  }))

  await svc.previewPickup(CODE)

  const pkg = await packageRepo.findByCodeHash(hashCode(CODE))
  expect(pkg?.status).toBe('STORED')
})

test('previewPickup does NOT call setLockerAvailable', async () => {
  const { packageRepo } = makeStubs()
  const setLockerAvailableCalls: string[] = []

  const lockerService: LockerService = {
    getAllLockers:        () => Promise.resolve([]),
    getAvailableLockers: () => Promise.resolve([]),
    releaseExpiredHolds: () => Promise.resolve(),
    holdBestFit:         () => Promise.resolve(createLocker()),
    confirmOccupied:     () => Promise.resolve(),
    setLockerAvailable:  (id) => { setLockerAvailableCalls.push(id); return Promise.resolve() },
  }

  const svc = createPackageService(lockerService, packageRepo, { send: () => Promise.resolve() })
  await packageRepo.save(createPackage({
    pickupCodeHash: hashCode(CODE),
    status: 'STORED',
    lockerId: 'locker-1',
    lockerNumber: 'L-001',
  }))

  await svc.previewPickup(CODE)

  expect(setLockerAvailableCalls).toHaveLength(0)
})

test('previewPickup minimum 1 day charge for newly stored package', async () => {
  const { svc, packageRepo } = makeStubs()
  await packageRepo.save(createPackage({
    pickupCodeHash: hashCode(CODE),
    status: 'STORED',
    lockerId: 'locker-1',
    lockerNumber: 'L-001',
    createdAt: new Date(),  // just now
  }))

  const preview = await svc.previewPickup(CODE)

  expect(preview.days).toBe(1)
  expect(preview.totalCharge).toBe(0.50)
})
