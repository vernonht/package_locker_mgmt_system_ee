import { generateCode, hashCode, verifyCode } from './code.service'

test('generateCode returns a 6-char uppercase hex string', () => {
  const code = generateCode()
  expect(code).toMatch(/^[0-9A-F]{6}$/)
})

test('generateCode produces unique values', () => {
  const codes = new Set(Array.from({ length: 20 }, generateCode))
  expect(codes.size).toBeGreaterThan(1)
})

test('hashCode is deterministic for the same input', () => {
  expect(hashCode('ABC123')).toBe(hashCode('ABC123'))
})

test('hashCode returns a 64-char hex string', () => {
  expect(hashCode('ABC123')).toMatch(/^[0-9a-f]{64}$/)
})

test('verifyCode returns true for the correct code', () => {
  const code = generateCode()
  expect(verifyCode(code, hashCode(code))).toBe(true)
})

test('verifyCode returns false for a wrong code', () => {
  const code = generateCode()
  expect(verifyCode('WRONG1', hashCode(code))).toBe(false)
})
