import { bestFitByVolume } from './best-fit.strategy'
import { createLocker } from '@/lib/factories/locker.factory'
import { LockerUnavailableError, ParcelTooLargeError } from '@/lib/errors'

const small  = () => createLocker({ size: 'SMALL',  maxWidth: 30, maxHeight: 30, maxDepth: 40 })
const medium = () => createLocker({ size: 'MEDIUM', maxWidth: 50, maxHeight: 50, maxDepth: 60 })
const large  = () => createLocker({ size: 'LARGE',  maxWidth: 80, maxHeight: 80, maxDepth: 100 })

test('returns smallest fitting locker by volume', () => {
  const lockers = [large(), medium(), small()]
  const result = bestFitByVolume(25, 25, 35, lockers)
  expect(result.size).toBe('SMALL')
})

test('throws ParcelTooLargeError when parcel exceeds all lockers', () => {
  const lockers = [small(), medium()]
  expect(() => bestFitByVolume(90, 90, 110, lockers)).toThrow(ParcelTooLargeError)
})

test('throws LockerUnavailableError when fitting lockers all OCCUPIED', () => {
  const lockers = [
    createLocker({ size: 'SMALL', maxWidth: 30, maxHeight: 30, maxDepth: 40, status: 'OCCUPIED' }),
  ]
  expect(() => bestFitByVolume(25, 25, 35, lockers)).toThrow(LockerUnavailableError)
})

test('throws LockerUnavailableError when fitting lockers all HOLD', () => {
  const lockers = [
    createLocker({ size: 'SMALL', maxWidth: 30, maxHeight: 30, maxDepth: 40, status: 'HOLD' }),
  ]
  expect(() => bestFitByVolume(25, 25, 35, lockers)).toThrow(LockerUnavailableError)
})

test('ignores OUT_OF_ORDER lockers', () => {
  const lockers = [
    createLocker({ size: 'SMALL', maxWidth: 30, maxHeight: 30, maxDepth: 40, status: 'OUT_OF_ORDER' }),
    medium(),
  ]
  const result = bestFitByVolume(25, 25, 35, lockers)
  expect(result.size).toBe('MEDIUM')
})
