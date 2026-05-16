import { createPackageService } from './package.service'
import { createInMemoryPackageRepository } from '@/lib/repositories/in-memory/package.repository'
import { createLocker } from '@/lib/factories/locker.factory'
import { LockerNotHeldError, HoldExpiredError, InvalidCodeError } from '@/lib/errors'
import type { LockerService } from './locker.service'
import type { NotificationService } from './notification.service'
import { hashCode } from './code.service'

const makeStubs = (lockerOverrides: Partial<LockerService> = {}) => {
  const packageRepo = createInMemoryPackageRepository()
  const lockers = [createLocker({ id: 'locker-1', lockerNumber: 'L-001' })]

  const lockerService: LockerService = {
    getAllLockers:        () => lockers,
    getAvailableLockers: () => [],
    releaseExpiredHolds: () => {},
    holdBestFit:         () => createLocker(),
    confirmOccupied:     () => {},
    setLockerAvailable:  () => {},
    ...lockerOverrides,
  }

  const notificationCalls: { phone: string; lockerNumber: string; code: string }[] = []
  const notificationService: NotificationService = {
    send: (phone, lockerNumber, code) => { notificationCalls.push({ phone, lockerNumber, code }) },
  }

  const svc = createPackageService(lockerService, packageRepo, notificationService)
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

test('depositPackage returns a 6-char pickup code on success', () => {
  const { svc } = makeStubs()
  const result = svc.depositPackage(validInput)
  expect(result.pickupCode).toMatch(/^[0-9A-F]{6}$/)
})

test('depositPackage saves the package as STORED', () => {
  const { svc, packageRepo } = makeStubs()
  svc.depositPackage(validInput)
  const pkgs = packageRepo.findByCodeHash
  // verify at least one package was stored by searching via code hash
  const result = svc.depositPackage(validInput)
  const pkg = packageRepo.findByCodeHash(hashCode(result.pickupCode))
  expect(pkg?.status).toBe('STORED')
})

test('depositPackage calls notificationService.send with correct args', () => {
  const { svc, notificationCalls } = makeStubs()
  const result = svc.depositPackage(validInput)
  expect(notificationCalls).toHaveLength(1)
  expect(notificationCalls[0].phone).toBe('+60123456789')
  expect(notificationCalls[0].lockerNumber).toBe('L-001')
  expect(notificationCalls[0].code).toBe(result.pickupCode)
})

test('depositPackage propagates LockerNotHeldError from lockerService', () => {
  const { svc } = makeStubs({
    confirmOccupied: () => { throw new LockerNotHeldError() },
  })
  expect(() => svc.depositPackage(validInput)).toThrow(LockerNotHeldError)
})

test('depositPackage propagates HoldExpiredError from lockerService', () => {
  const { svc } = makeStubs({
    confirmOccupied: () => { throw new HoldExpiredError() },
  })
  expect(() => svc.depositPackage(validInput)).toThrow(HoldExpiredError)
})

test('pickupPackage marks package RETRIEVED and locker AVAILABLE', () => {
  const setLockerAvailableCalls: string[] = []
  const { svc, packageRepo } = makeStubs({
    setLockerAvailable: (id) => { setLockerAvailableCalls.push(id) },
  })

  const { pickupCode } = svc.depositPackage(validInput)
  const result = svc.pickupPackage(pickupCode)

  const pkg = packageRepo.findByCodeHash(hashCode(pickupCode))
  expect(pkg?.status).toBe('RETRIEVED')
  expect(pkg?.retrievedAt).toBeInstanceOf(Date)
  expect(result.lockerId).toBe('locker-1')
  expect(result.lockerNumber).toBe('L-001')
  expect(setLockerAvailableCalls).toHaveLength(1)
})

test('pickupPackage throws InvalidCodeError for wrong code', () => {
  const { svc } = makeStubs()
  svc.depositPackage(validInput)
  expect(() => svc.pickupPackage('WRONG1')).toThrow(InvalidCodeError)
})

test('pickupPackage throws InvalidCodeError if already RETRIEVED', () => {
  const { svc } = makeStubs()
  const { pickupCode } = svc.depositPackage(validInput)
  svc.pickupPackage(pickupCode)
  expect(() => svc.pickupPackage(pickupCode)).toThrow(InvalidCodeError)
})
