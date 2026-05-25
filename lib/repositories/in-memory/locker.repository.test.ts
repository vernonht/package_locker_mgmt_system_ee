import { createInMemoryLockerRepository } from './locker.repository'
import { createLocker } from '@/lib/factories/locker.factory'

const makeRepo = async (...seed: Parameters<typeof createLocker>[0][]) => {
  const repo = createInMemoryLockerRepository()
  for (const overrides of seed) await repo.save(createLocker(overrides))
  return repo
}

test('findAll returns all saved lockers', async () => {
  const repo = await makeRepo({}, {})
  expect(await repo.findAll()).toHaveLength(2)
})

test('findAll filters by status', async () => {
  const repo = await makeRepo({ status: 'AVAILABLE' }, { status: 'HOLD' }, { status: 'OCCUPIED' })
  const lockers = await repo.findAll({ status: 'AVAILABLE' })
  expect(lockers).toHaveLength(1)
  expect(lockers[0].status).toBe('AVAILABLE')
})

test('findAll filters by size and status', async () => {
  const repo = await makeRepo(
    { size: 'SMALL', status: 'AVAILABLE' },
    { size: 'SMALL', status: 'HOLD' },
    { size: 'MEDIUM', status: 'AVAILABLE' },
  )
  const lockers = await repo.findAll({ size: 'SMALL', status: 'AVAILABLE' })
  expect(lockers).toHaveLength(1)
  expect(lockers[0].size).toBe('SMALL')
  expect(lockers[0].status).toBe('AVAILABLE')
})

test('findById returns correct locker', async () => {
  const locker = createLocker()
  const repo = createInMemoryLockerRepository()
  await repo.save(locker)
  expect((await repo.findById(locker.id))?.id).toBe(locker.id)
})

test('findById returns null for unknown id', async () => {
  const repo = createInMemoryLockerRepository()
  expect(await repo.findById('nonexistent')).toBeNull()
})

test('findAvailable returns only AVAILABLE lockers', async () => {
  const repo = await makeRepo({ status: 'AVAILABLE' }, { status: 'OCCUPIED' }, { status: 'HOLD' })
  expect(await repo.findAvailable()).toHaveLength(1)
})

test('findHeld returns only HOLD lockers', async () => {
  const repo = await makeRepo({ status: 'AVAILABLE' }, { status: 'HOLD' }, { status: 'HOLD' })
  expect(await repo.findHeld()).toHaveLength(2)
})

test('findFitting returns lockers that can fit parcel dimensions', async () => {
  const repo = await makeRepo(
    { maxWidth: 30, maxHeight: 30, maxDepth: 40 },
    { maxWidth: 50, maxHeight: 50, maxDepth: 60 },
  )
  const fitting = await repo.findFitting(45, 45, 55)
  expect(fitting).toHaveLength(1)
  expect(fitting[0].maxWidth).toBe(50)
})

test('update patches locker in store', async () => {
  const locker = createLocker({ status: 'AVAILABLE' })
  const repo = createInMemoryLockerRepository()
  await repo.save(locker)
  await repo.update(locker.id, { status: 'OCCUPIED' })
  expect((await repo.findById(locker.id))?.status).toBe('OCCUPIED')
})

test('update is a spread — does not mutate other fields', async () => {
  const locker = createLocker({ maxWidth: 30, status: 'AVAILABLE' })
  const repo = createInMemoryLockerRepository()
  await repo.save(locker)
  await repo.update(locker.id, { status: 'HOLD' })
  expect((await repo.findById(locker.id))?.maxWidth).toBe(30)
})
