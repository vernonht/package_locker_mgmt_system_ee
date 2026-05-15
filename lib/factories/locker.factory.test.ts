import { createLocker } from './locker.factory'

test('createLocker returns default values', () => {
  const locker = createLocker()
  expect(locker.size).toBe('SMALL')
  expect(locker.maxWidth).toBe(30)
  expect(locker.maxHeight).toBe(30)
  expect(locker.maxDepth).toBe(40)
  expect(locker.status).toBe('AVAILABLE')
  expect(locker.currentPackageId).toBeNull()
  expect(locker.heldAt).toBeNull()
  expect(typeof locker.id).toBe('string')
})

test('createLocker applies overrides', () => {
  const locker = createLocker({ size: 'LARGE', maxWidth: 80 })
  expect(locker.size).toBe('LARGE')
  expect(locker.maxWidth).toBe(80)
  expect(locker.maxHeight).toBe(30)
})

test('createLocker generates unique IDs', () => {
  const a = createLocker()
  const b = createLocker()
  expect(a.id).not.toBe(b.id)
})
