import { holdSchema } from './hold.schema'
import { depositSchema } from './deposit.schema'
import { pickupSchema } from './pickup.schema'
import { createLockerSchema } from './locker.schema'

// --- holdSchema ---

test('holdSchema accepts valid dimensions', () => {
  const result = holdSchema.safeParse({ width: 25, height: 20, depth: 15 })
  expect(result.success).toBe(true)
})

test('holdSchema rejects zero dimensions', () => {
  const result = holdSchema.safeParse({ width: 0, height: 20, depth: 15 })
  expect(result.success).toBe(false)
})

test('holdSchema rejects negative dimensions', () => {
  const result = holdSchema.safeParse({ width: -1, height: 20, depth: 15 })
  expect(result.success).toBe(false)
})

test('holdSchema rejects missing fields', () => {
  const result = holdSchema.safeParse({ width: 25 })
  expect(result.success).toBe(false)
})

// --- depositSchema ---

test('depositSchema accepts valid input', () => {
  const result = depositSchema.safeParse({
    lockerId:       'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    lockerNumber:   'L-001',
    recipientName:  'Jane',
    recipientPhone: '+60123456789',
    width:          25,
    height:         20,
    depth:          15,
  })
  expect(result.success).toBe(true)
})

test('depositSchema rejects non-uuid lockerId', () => {
  const result = depositSchema.safeParse({
    lockerId:       'not-a-uuid',
    recipientName:  'Jane',
    recipientPhone: '+60123456789',
    width: 25, height: 20, depth: 15,
  })
  expect(result.success).toBe(false)
})

test('depositSchema rejects empty recipientName', () => {
  const result = depositSchema.safeParse({
    lockerId:       'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    recipientName:  '',
    recipientPhone: '+60123456789',
    width: 25, height: 20, depth: 15,
  })
  expect(result.success).toBe(false)
})

// --- pickupSchema ---

test('pickupSchema accepts a 6-char code with locker number', () => {
  const result = pickupSchema.safeParse({ pickupCode: 'A3F9C1', lockerNumber: 'L-001' })
  expect(result.success).toBe(true)
})

test('pickupSchema rejects codes that are not 6 chars', () => {
  expect(pickupSchema.safeParse({ pickupCode: 'ABC', lockerNumber: 'L-001' }).success).toBe(false)
  expect(pickupSchema.safeParse({ pickupCode: 'TOOLONG', lockerNumber: 'L-001' }).success).toBe(false)
})

test('pickupSchema rejects missing pickupCode', () => {
  expect(pickupSchema.safeParse({}).success).toBe(false)
})

test('pickupSchema rejects missing lockerNumber', () => {
  expect(pickupSchema.safeParse({ pickupCode: 'A3F9C1' }).success).toBe(false)
})

test('pickupSchema rejects empty lockerNumber', () => {
  expect(pickupSchema.safeParse({ pickupCode: 'A3F9C1', lockerNumber: '' }).success).toBe(false)
})

// --- createLockerSchema ---

test('createLockerSchema accepts valid locker input', () => {
  const result = createLockerSchema.safeParse({ size: 'MEDIUM', maxWidth: 50, maxHeight: 50, maxDepth: 60 })
  expect(result.success).toBe(true)
})

test('createLockerSchema rejects invalid size', () => {
  expect(createLockerSchema.safeParse({ size: 'HUGE', maxWidth: 50, maxHeight: 50, maxDepth: 60 }).success).toBe(false)
})

test('createLockerSchema rejects zero or negative dimensions', () => {
  expect(createLockerSchema.safeParse({ size: 'SMALL', maxWidth: 0, maxHeight: 30, maxDepth: 40 }).success).toBe(false)
  expect(createLockerSchema.safeParse({ size: 'SMALL', maxWidth: 30, maxHeight: -1, maxDepth: 40 }).success).toBe(false)
})

test('createLockerSchema rejects missing fields', () => {
  expect(createLockerSchema.safeParse({ size: 'SMALL' }).success).toBe(false)
})
