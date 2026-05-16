import { createPackageService } from './package.service'
import { createInMemoryPackageRepository } from '@/lib/repositories/in-memory/package.repository'
import { createInMemoryStorageChargeConfigRepository } from '@/lib/repositories/in-memory/storage-charge-config.repository'
import { createLocker } from '@/lib/factories/locker.factory'
import { LockerNotHeldError, HoldExpiredError, InvalidCodeError } from '@/lib/errors'
import type { LockerService } from './locker.service'
import type { NotificationService } from './notification.service'
import { hashCode } from './code.service'

const makeStubs = (lockerOverrides: Partial<LockerService> = {}) => {
  const packageRepo = createInMemoryPackageRepository()
  const lockers = [createLocker({ id: 'locker-1', lockerNumber: 'L-001' })]

  const lockerService: LockerService = {
    getAllLockers:        () => Promise.resolve(lockers),
    getAvailableLockers: () => Promise.resolve([]),
    releaseExpiredHolds: () => Promise.resolve(),
    holdBestFit:         () => Promise.resolve(createLocker()),
    confirmOccupied:     () => Promise.resolve(),
    setLockerAvailable:  () => Promise.resolve(),
    ...lockerOverrides,
  }

  const notificationCalls: { phone: string; lockerNumber: string; code: string }[] = []
  const notificationService: NotificationService = {
    send: (phone, lockerNumber, code) => { notificationCalls.push({ phone, lockerNumber, code }); return Promise.resolve() },
  }

  const storageChargeConfigRepo = createInMemoryStorageChargeConfigRepository()
  const svc = createPackageService(lockerService, packageRepo, notificationService, storageChargeConfigRepo)
  return { svc, packageRepo, notificationCalls }
}

const validInput = {
  lockerId:       'locker-1',
  lockerNumber:   'L-001',
  recipientName:  'Jane',
  recipientPhone: '+60123456789',
  width:          25,
  height:         20,
  depth:          15,
}

test('depositPackage returns the lockerId', async () => {
  const { svc } = makeStubs()
  const result = await svc.depositPackage(validInput)
  expect(result.lockerId).toBe('locker-1')
})

test('depositPackage saves the package as STORED', async () => {
  const { svc, packageRepo, notificationCalls } = makeStubs()
  await svc.depositPackage(validInput)
  const pkg = await packageRepo.findByCodeHash(hashCode(notificationCalls[0].code))
  expect(pkg?.status).toBe('STORED')
})

test('depositPackage calls notificationService.send with correct args', async () => {
  const { svc, notificationCalls } = makeStubs()
  await svc.depositPackage(validInput)
  expect(notificationCalls).toHaveLength(1)
  expect(notificationCalls[0].phone).toBe('+60123456789')
  expect(notificationCalls[0].lockerNumber).toBe('L-001')
  expect(notificationCalls[0].code).toMatch(/^[0-9A-F]{6}$/)
})

test('depositPackage propagates LockerNotHeldError from lockerService', async () => {
  const { svc } = makeStubs({
    confirmOccupied: () => { throw new LockerNotHeldError() },
  })
  await expect(svc.depositPackage(validInput)).rejects.toThrow(LockerNotHeldError)
})

test('depositPackage propagates HoldExpiredError from lockerService', async () => {
  const { svc } = makeStubs({
    confirmOccupied: () => { throw new HoldExpiredError() },
  })
  await expect(svc.depositPackage(validInput)).rejects.toThrow(HoldExpiredError)
})

test('pickupPackage marks package RETRIEVED and locker AVAILABLE', async () => {
  const setLockerAvailableCalls: string[] = []
  const { svc, packageRepo, notificationCalls } = makeStubs({
    setLockerAvailable: (id) => { setLockerAvailableCalls.push(id); return Promise.resolve() },
  })

  await svc.depositPackage(validInput)
  const pickupCode = notificationCalls[0].code
  const result = await svc.pickupPackage(pickupCode, 'L-001')

  const pkg = await packageRepo.findByCodeHash(hashCode(pickupCode))
  expect(pkg?.status).toBe('RETRIEVED')
  expect(pkg?.retrievedAt).toBeInstanceOf(Date)
  expect(result.lockerId).toBe('locker-1')
  expect(result.lockerNumber).toBe('L-001')
  expect(setLockerAvailableCalls).toHaveLength(1)
})

test('pickupPackage throws InvalidCodeError for wrong code', async () => {
  const { svc } = makeStubs()
  await svc.depositPackage(validInput)
  await expect(svc.pickupPackage('WRONG1', 'L-001')).rejects.toThrow(InvalidCodeError)
})

test('pickupPackage throws InvalidCodeError for wrong locker number', async () => {
  const { svc, notificationCalls } = makeStubs()
  await svc.depositPackage(validInput)
  const pickupCode = notificationCalls[0].code
  await expect(svc.pickupPackage(pickupCode, 'L-999')).rejects.toThrow(InvalidCodeError)
})

test('pickupPackage throws InvalidCodeError if already RETRIEVED', async () => {
  const { svc, notificationCalls } = makeStubs()
  await svc.depositPackage(validInput)
  const pickupCode = notificationCalls[0].code
  await svc.pickupPackage(pickupCode, 'L-001')
  await expect(svc.pickupPackage(pickupCode, 'L-001')).rejects.toThrow(InvalidCodeError)
})
