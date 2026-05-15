import {
  LockerUnavailableError,
  LockerNotHeldError,
  HoldExpiredError,
  ParcelTooLargeError,
  InvalidCodeError,
} from './errors'

test('LockerUnavailableError has correct name and code', () => {
  const err = new LockerUnavailableError()
  expect(err.name).toBe('LockerUnavailableError')
  expect(err.code).toBe('LOCKER_UNAVAILABLE')
  expect(err instanceof Error).toBe(true)
})

test('LockerNotHeldError has correct name and code', () => {
  const err = new LockerNotHeldError()
  expect(err.name).toBe('LockerNotHeldError')
  expect(err.code).toBe('LOCKER_NOT_HELD')
})

test('HoldExpiredError has correct name and code', () => {
  const err = new HoldExpiredError()
  expect(err.name).toBe('HoldExpiredError')
  expect(err.code).toBe('HOLD_EXPIRED')
})

test('ParcelTooLargeError includes dimensions in message', () => {
  const err = new ParcelTooLargeError('25×20×15')
  expect(err.name).toBe('ParcelTooLargeError')
  expect(err.code).toBe('PARCEL_TOO_LARGE')
  expect(err.message).toContain('25×20×15')
})

test('InvalidCodeError has correct name and code', () => {
  const err = new InvalidCodeError()
  expect(err.name).toBe('InvalidCodeError')
  expect(err.code).toBe('INVALID_CODE')
})
