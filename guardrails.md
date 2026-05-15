# Engineering Guardrails

These rules apply across every skill. They are non-negotiable — no skill is "done" if it violates them.

**Style baseline**: prefer modules of exported functions over classes. Use factory functions for dependency injection. Reserve `class` for custom errors only (where `instanceof` checks are needed in catch blocks).

---

## 1. SOLID Principles

### S — Single Responsibility
Each module owns exactly one concern. If you're reaching across concerns inside a file, split it.

| File | Its one job |
|------|-------------|
| `code.service.ts` | Crypto only — generate, hash, verify |
| `locker.service.ts` | Locker state and allocation only |
| `package.service.ts` | Orchestrate deposit/pickup — delegates everything else |
| `notification.service.ts` | SMS formatting and logging only |
| `locker.repository.ts` | Data access for lockers only |

**Violation to avoid**: `package.service.ts` importing `crypto` directly, or writing to the locker store itself.

---

### O — Open/Closed
Open for extension, closed for modification. Pass behaviour in as a function — callers extend by providing a different function, not by modifying the module.

**Allocation strategy** — typed as a plain function, not a class:

```ts
// lib/strategies/allocation.strategy.ts
export type AllocationStrategy = (
  width: number,
  height: number,
  depth: number,
  candidates: Locker[],
) => Locker  // throws ParcelTooLargeError | LockerUnavailableError, never returns null

// lib/strategies/best-fit.strategy.ts
export const bestFitByVolume: AllocationStrategy = (w, h, d, candidates) => {
  const volume = (l: Locker) => l.maxWidth * l.maxHeight * l.maxDepth
  const fitting = candidates.filter(l => l.maxWidth >= w && l.maxHeight >= h && l.maxDepth >= d)
  if (fitting.length === 0) throw new ParcelTooLargeError(`${w}×${h}×${d}`)
  const available = fitting.filter(l => l.status === 'AVAILABLE')
  if (available.length === 0) throw new LockerUnavailableError()
  return available.sort((a, b) => volume(a) - volume(b))[0]
}

// Swap without touching LockerService:
export const firstFit: AllocationStrategy = (w, h, d, candidates) => { ... }
```

**Notification** — typed as a plain object shape:
```ts
// lib/services/notification.service.ts
export type NotificationService = {
  send(phone: string, lockerId: string, code: string): void
}

export const mockNotificationService: NotificationService = {
  send: (phone, lockerId, code) => {
    const msg = `SMS → ${phone}: Locker ${lockerId}. Code: ${code}`
    console.log(msg)
    notificationRepo.save({ id: uuid(), recipientPhone: phone, lockerId, message: msg, sentAt: new Date() })
  },
}
```

---

### L — Liskov Substitution
Any value that satisfies a type must be drop-in replaceable. `mockNotificationService` and a future `twilioNotificationService` both satisfy `NotificationService`. `createPackageService` must not care which it receives.

Concretely: never narrow a dependency to its concrete type inside a consumer. Receive `NotificationService`, not `typeof mockNotificationService`.

---

### I — Interface Segregation
Don't bundle unrelated operations into one type. Split read and write:

```ts
// lib/repositories/interfaces/locker.repository.ts
export type LockerReader = {
  findAll(): Locker[]
  findById(id: string): Locker | null
  findAvailable(): Locker[]
  findFitting(w: number, h: number, d: number): Locker[]
}

export type LockerWriter = {
  save(locker: Locker): void
  update(id: string, patch: Partial<Locker>): void
}

export type LockerRepository = LockerReader & LockerWriter

// A read-only admin view only needs LockerReader — no write access exposed
```

---

### D — Dependency Inversion
Services depend on types (abstractions), not on concrete imports. Inject dependencies via factory function parameters.

```ts
// BAD — service imports the concrete store or repository directly
import { lockerStore } from '@/lib/db/store'

// GOOD — factory receives dependencies, returns the service object
export const createLockerService = (
  repo: LockerRepository,
  strategy: AllocationStrategy,
) => ({
  getAllLockers:     ()                            => repo.findAll(),
  getAvailableLockers: ()                         => repo.findAvailable(),
  allocateBestFit:  (w: number, h: number, d: number) => strategy(w, h, d, repo.findAll()),
  setLockerOccupied: (id: string, pkgId: string)  => repo.update(id, { status: 'OCCUPIED', currentPackageId: pkgId }),
  setLockerAvailable:(id: string)                 => repo.update(id, { status: 'AVAILABLE', currentPackageId: null }),
})

export type LockerService = ReturnType<typeof createLockerService>
```

This makes every service testable with plain object stubs — no mocking framework needed.

---

## 2. Test-Driven Development (TDD)

### Workflow
For every skill that produces logic, write the test file first, watch it fail, then implement until it passes:

```
1. Write a failing test that describes the expected behaviour
2. Write the minimum code to make it pass
3. Refactor — keep tests green
```

### Test File Convention
Co-locate tests next to source:
```
lib/services/locker.service.ts
lib/services/locker.service.test.ts
lib/strategies/best-fit.strategy.ts
lib/strategies/best-fit.strategy.test.ts
```

### Test Layers

| Layer | Tool | What it tests |
|-------|------|---------------|
| Unit | Jest | Pure functions and factory-created services with stub repos |
| Integration | Jest + supertest | API route handlers end-to-end against in-memory repos |
| E2E (optional) | Playwright | Full browser flows for Agent + Customer UIs |

### What to test per module

**code.service**
```
✓ generateCode returns a 6-char uppercase hex string
✓ hashCode is deterministic for the same input
✓ verifyCode returns true for the correct code
✓ verifyCode returns false for a wrong code
```

**best-fit.strategy**
```
✓ returns the smallest fitting locker by volume
✓ skips OCCUPIED lockers
✓ skips OUT_OF_ORDER lockers
✓ throws ParcelTooLargeError when parcel exceeds all lockers
✓ throws LockerUnavailableError when fitting lockers exist but all occupied
```

**locker.service**
```
✓ getAllLockers delegates to repo.findAll
✓ allocateBestFit passes repo.findAll() result to strategy
✓ setLockerOccupied calls repo.update with OCCUPIED status and packageId
✓ setLockerAvailable calls repo.update with AVAILABLE status and null packageId
```

**package.service**
```
✓ depositPackage returns lockerId, lockerSize, pickupCode on success
✓ depositPackage propagates ParcelTooLargeError from lockerService
✓ depositPackage propagates LockerUnavailableError from lockerService
✓ depositPackage calls notificationService.send with correct args
✓ pickupPackage marks package RETRIEVED and locker AVAILABLE on valid code
✓ pickupPackage throws InvalidCodeError for a wrong code
✓ pickupPackage throws InvalidCodeError if package is already RETRIEVED
```

### Stub pattern for unit tests
Plain object literals that satisfy the type — no mocking library needed:

```ts
// locker.service.test.ts
import { createLockerService } from './locker.service'
import { createLocker } from '@/lib/factories/locker.factory'
import type { LockerRepository } from '@/lib/repositories/interfaces/locker.repository'
import type { AllocationStrategy } from '@/lib/strategies/allocation.strategy'

const makeStubs = (seed: Locker[] = []) => {
  const store = [...seed]

  const repo: LockerRepository = {
    findAll:      () => store,
    findById:     (id) => store.find(l => l.id === id) ?? null,
    findAvailable: () => store.filter(l => l.status === 'AVAILABLE'),
    findFitting:  (w, h, d) => store.filter(l => l.maxWidth >= w && l.maxHeight >= h && l.maxDepth >= d),
    save:         (l) => { store.push(l) },
    update:       (id, patch) => {
      const i = store.findIndex(l => l.id === id)
      if (i !== -1) store[i] = { ...store[i], ...patch }
    },
  }

  const strategy: AllocationStrategy = (_w, _h, _d, candidates) => candidates[0]  // returns first available

  return { repo, strategy, store }
}

test('setLockerOccupied marks locker OCCUPIED', () => {
  const locker = createLocker()
  const { repo, strategy, store } = makeStubs([locker])
  const service = createLockerService(repo, strategy)

  service.setLockerOccupied(locker.id, 'pkg-1')

  expect(store[0].status).toBe('OCCUPIED')
  expect(store[0].currentPackageId).toBe('pkg-1')
})
```

---

## 3. Design Patterns

### Repository Pattern
All data access goes through repository objects created by factory functions. Services never import from the store or Prisma directly.

```
createLockerService(repo, strategy)
           │
           ▼
    LockerRepository (type)
           ▲
    ┌──────┴──────┐
createInMemoryLockerRepo()   createPrismaLockerRepo(prisma)
(Phase 1–5 + all tests)       (Phase 6+)
```

Swapping in-memory for PostgreSQL = swap the argument passed to `createLockerService`. Zero service changes.

---

### Strategy Pattern
The allocation algorithm is a plain function passed into `createLockerService`. Swap strategies without touching the service:

```ts
// dev / default
const lockerService = createLockerService(repo, bestFitByVolume)

// future experiment — one line change at the composition root
const lockerService = createLockerService(repo, firstFit)
```

---

### Factory Functions for Domain Objects
Use factory functions (not raw object literals) to create domain entities. Centralises defaults, enforces shape, and keeps tests concise:

```ts
// lib/factories/locker.factory.ts
import { v4 as uuid } from 'uuid'
import type { Locker } from '@/lib/models/locker'

export const createLocker = (overrides?: Partial<Locker>): Locker => ({
  id:               uuid(),
  size:             'SMALL',
  maxWidth:         30,
  maxHeight:        30,
  maxDepth:         40,
  status:           'AVAILABLE',
  currentPackageId: null,
  ...overrides,
})
```

Used identically in seed data and in every test — one source of truth for defaults.

---

### Factory Functions for Services (Composition Root)
Wire everything together in one place (`lib/db/store.ts`) so the rest of the app just imports ready-made service instances:

```ts
// lib/db/store.ts
import { createInMemoryLockerRepository }       from '@/lib/repositories/in-memory/locker.repository'
import { createInMemoryPackageRepository }      from '@/lib/repositories/in-memory/package.repository'
import { createInMemoryNotificationRepository } from '@/lib/repositories/in-memory/notification.repository'
import { bestFitByVolume }                      from '@/lib/strategies/best-fit.strategy'
import { createLockerService }                  from '@/lib/services/locker.service'
import { createPackageService }                 from '@/lib/services/package.service'
import { createLocker }                         from '@/lib/factories/locker.factory'

const lockerRepo       = createInMemoryLockerRepository()
const packageRepo      = createInMemoryPackageRepository()
const notificationRepo = createInMemoryNotificationRepository()

// Seed
const SEED: Parameters<typeof createLocker>[0][] = [
  ...Array(3).fill({ size: 'SMALL',  maxWidth: 30, maxHeight: 30, maxDepth: 40  }),
  ...Array(3).fill({ size: 'MEDIUM', maxWidth: 50, maxHeight: 50, maxDepth: 60  }),
  ...Array(2).fill({ size: 'LARGE',  maxWidth: 80, maxHeight: 80, maxDepth: 100 }),
]
SEED.forEach(overrides => lockerRepo.save(createLocker(overrides)))

export const lockerService  = createLockerService(lockerRepo, bestFitByVolume)
export const packageService = createPackageService(lockerService, packageRepo, notificationRepo)

export const resetStore = () => { /* clear all Maps, re-seed */ }
```

Route handlers import `lockerService` and `packageService` directly — they never construct anything themselves.

---

### Custom Error Hierarchy
`class` is used here because `instanceof` in catch blocks requires it. This is the one sanctioned use of `class`:

```ts
// lib/errors.ts
export class AppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export class LockerUnavailableError extends AppError {
  constructor() { super('No available lockers fit the parcel dimensions', 'LOCKER_UNAVAILABLE') }
}

export class LockerNotHeldError extends AppError {
  constructor() { super('Locker is not in HOLD state — call hold first', 'LOCKER_NOT_HELD') }
}

export class HoldExpiredError extends AppError {
  constructor() { super('Locker hold has expired — please reserve again', 'HOLD_EXPIRED') }
}

export class ParcelTooLargeError extends AppError {
  constructor(dims: string) { super(`Parcel (${dims} cm) exceeds the largest locker`, 'PARCEL_TOO_LARGE') }
}

export class InvalidCodeError extends AppError {
  constructor() { super('Invalid or expired pickup code', 'INVALID_CODE') }
}
```

Route handlers catch by type — never by message string:
```ts
} catch (err) {
  if (err instanceof ParcelTooLargeError)    return Response.json({ error: err.message, code: err.code }, { status: 422 })
  if (err instanceof LockerUnavailableError) return Response.json({ error: err.message, code: err.code }, { status: 409 })
  if (err instanceof LockerNotHeldError)     return Response.json({ error: err.message, code: err.code }, { status: 409 })
  if (err instanceof HoldExpiredError)       return Response.json({ error: err.message, code: err.code }, { status: 410 })
  if (err instanceof InvalidCodeError)       return Response.json({ error: err.message, code: err.code }, { status: 404 })
  throw err  // unexpected — let Next.js handle it
}
```

---

## 4. Code Quality Standards

| Rule | Detail |
|------|--------|
| No `class` outside `lib/errors.ts` | Use factory functions + plain object types everywhere else |
| No `any` | `strict: true` in tsconfig — treat `any` as a build error |
| No raw object mutations | Spread into a new object; never mutate in place |
| Inputs validated at the boundary | Zod schemas on all API routes — services trust their inputs |
| No plaintext secrets | Pickup codes hashed before storage; `.env` excluded from git |
| Typed errors only | Every throw uses a class from `lib/errors.ts` |
| Test before implement | Every exported function has a failing test written before the implementation |
