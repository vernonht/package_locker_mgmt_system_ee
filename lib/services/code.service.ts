import { randomBytes, createHash, timingSafeEqual } from 'crypto'

export const generateCode = (): string =>
  randomBytes(3).toString('hex').toUpperCase()

export const hashCode = (code: string): string =>
  createHash('sha256').update(code).digest('hex')

export const verifyCode = (input: string, storedHash: string): boolean => {
  const inputHash = Buffer.from(hashCode(input))
  const stored    = Buffer.from(storedHash)
  if (inputHash.length !== stored.length) return false
  return timingSafeEqual(inputHash, stored)
}
