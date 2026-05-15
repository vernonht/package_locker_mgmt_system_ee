import { createInMemoryLockerRepository } from './locker.repository'
import { createLocker } from '@/lib/factories/locker.factory'

const makeRepo = (...seed: Parameters<typeof createLocker>[0][]) => {
  const repo = createInMemoryLockerRepository()
  seed.forEach(overrides => repo.save(createLocker(overrides)))
  return repo
}

test('findAll returns all saved lockers', () => {
  const repo = makeRepo({}, {})
  expect(repo.findAll()).toHaveLength(2)
})

test('findById returns correct locker', () => {
  const locker = createLocker()
  const repo = createInMemoryLockerRepository()
  repo.save(locker)
  expect(repo.findById(locker.id)?.id).toBe(locker.id)
})

test('findById returns null for unknown id', () => {
  const repo = createInMemoryLockerRepository()
  expect(repo.findById('nonexistent')).toBeNull()
})

test('findAvailable returns only AVAILABLE lockers', () => {
  const repo = makeRepo({ status: 'AVAILABLE' }, { status: 'OCCUPIED' }, { status: 'HOLD' })
  expect(repo.findAvailable()).toHaveLength(1)
})

test('findHeld returns only HOLD lockers', () => {
  const repo = makeRepo({ status: 'AVAILABLE' }, { status: 'HOLD' }, { status: 'HOLD' })
  expect(repo.findHeld()).toHaveLength(2)
})

test('findFitting returns lockers that can fit parcel dimensions', () => {
  const repo = makeRepo(
    { maxWidth: 30, maxHeight: 30, maxDepth: 40 },
    { maxWidth: 50, maxHeight: 50, maxDepth: 60 },
  )
  const fitting = repo.findFitting(45, 45, 55)
  expect(fitting).toHaveLength(1)
  expect(fitting[0].maxWidth).toBe(50)
})

test('update patches locker in store', () => {
  const locker = createLocker({ status: 'AVAILABLE' })
  const repo = createInMemoryLockerRepository()
  repo.save(locker)
  repo.update(locker.id, { status: 'OCCUPIED' })
  expect(repo.findById(locker.id)?.status).toBe('OCCUPIED')
})

test('update is a spread — does not mutate other fields', () => {
  const locker = createLocker({ maxWidth: 30, status: 'AVAILABLE' })
  const repo = createInMemoryLockerRepository()
  repo.save(locker)
  repo.update(locker.id, { status: 'HOLD' })
  expect(repo.findById(locker.id)?.maxWidth).toBe(30)
})
