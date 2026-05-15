import { createPackage } from './package.factory'

test('createPackage returns default values', () => {
  const pkg = createPackage()
  expect(pkg.status).toBe('PENDING_DEPOSIT')
  expect(pkg.lockerId).toBeNull()
  expect(pkg.retrievedAt).toBeNull()
  expect(pkg.pickupCodeHash).toBe('')
  expect(pkg.createdAt).toBeInstanceOf(Date)
  expect(typeof pkg.id).toBe('string')
})

test('createPackage applies overrides', () => {
  const pkg = createPackage({ recipientName: 'Alice', status: 'STORED' })
  expect(pkg.recipientName).toBe('Alice')
  expect(pkg.status).toBe('STORED')
})

test('createPackage generates unique IDs', () => {
  const a = createPackage()
  const b = createPackage()
  expect(a.id).not.toBe(b.id)
})
