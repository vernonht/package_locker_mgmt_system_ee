# Implementation Skills Breakdown

Each skill is a self-contained unit of work. Complete in order — later skills depend on earlier ones.

**TDD rule**: for every skill that produces logic, write the test file first, watch it fail, then implement until it passes.

---

## Skill 0 — Testing Infrastructure

**Goal**: Testing stack wired up before writing any logic.

- Install: `npm install -D jest ts-jest @types/jest supertest @types/supertest`
- `jest.config.ts`:
  ```ts
  export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  }
  ```
- Add to `package.json`: `"test": "jest"`, `"test:watch": "jest --watch"`
- Create `lib/__tests__/` for integration-level tests
- Verify: `npm test` runs with 0 tests, 0 failures

**Done when**: `npm test` exits green with empty test suite.

---

## Skill 1 — Project Bootstrap

**Goal**: Scaffold Next.js project with correct config.

- `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias '@/*'`
- Install dependencies: `zod`
- Note: do **not** install `uuid` — use `crypto.randomUUID()` (Node.js built-in) everywhere instead
- Delete boilerplate: `app/page.tsx` default content, `globals.css` excess styles
- Verify `tsconfig.json` has `strict: true`

**Done when**: `npm run dev` starts with no errors, TypeScript strict mode on.

---

## Skill 2 — Domain Models

**Goal**: Define all types and enums. Zero logic, zero side effects.

Files to create:
- `lib/models/locker.ts` — `LockerSize`, `LockerStatus` (`'AVAILABLE' | 'HOLD' | 'OCCUPIED' | 'OUT_OF_ORDER'`), `Locker` interface:
  ```ts
  interface Locker {
    id: string
    lockerNumber: string   // human-readable label e.g. "L-001", generated sequentially
    size: LockerSize
    maxWidth: number; maxHeight: number; maxDepth: number  // cm
    status: LockerStatus
    currentPackageId: string | null
    heldAt: Date | null
  }
  ```
- `lib/models/package.ts` — `PackageStatus`, `Package` interface (include `width`, `height`, `depth`, `lockerNumber: string | null` fields; no `packageSize`)
- `lib/models/notification.ts` — `NotificationLog` interface with `lockerNumber: string`

**Done when**: All models compile cleanly, no `any` types.

---

## Skill 2a — Custom Error Hierarchy

**Goal**: Typed errors for every failure mode. Route handlers catch by type, not by message string.

File: `lib/errors.ts`

```ts
export class AppError extends Error {
  constructor(message: string, public readonly code: string) { super(message); this.name = this.constructor.name }
}
export class LockerUnavailableError extends AppError { ... }  // 409 — fitting lockers exist but all OCCUPIED or HOLD
export class LockerNotHeldError extends AppError { ... }      // 409 — deposit attempted but locker is not in HOLD state
export class HoldExpiredError extends AppError { ... }        // 410 — hold existed but timed out; agent must re-hold
export class ParcelTooLargeError extends AppError { ... }     // 422 — include max locker dims in message
export class InvalidCodeError extends AppError { ... }        // 404
```

**TDD**: write `lib/errors.test.ts` first — assert each error has the right `.name`, `.code`, and `.message`.

**Done when**: All error classes have passing tests; no raw `new Error('string')` elsewhere in the codebase.

---

## Skill 2b — Repository Interfaces

**Goal**: Define the data-access contracts that services depend on. No implementation yet — just the interfaces.

Files:
- `lib/repositories/interfaces/locker.repository.ts`
  ```ts
  export type LockerRepository = {
    findAll(): Locker[]
    findById(id: string): Locker | null
    findAvailable(): Locker[]                              // status === 'AVAILABLE' only
    findHeld(): Locker[]                                   // status === 'HOLD' — for expiry scanning
    findFitting(w: number, h: number, d: number): Locker[] // all lockers that could fit, regardless of status
    save(locker: Locker): void
    update(id: string, patch: Partial<Locker>): void
  }
  ```
- `lib/repositories/interfaces/package.repository.ts` — same shape: `findById`, `findByCodeHash`, `save`, `update`
- `lib/repositories/interfaces/notification.repository.ts` — `save`, `findAll`

**Done when**: Interfaces compile cleanly. Services will `import type { ILockerRepository }` — never the concrete class.

---

## Skill 2c — Factory Functions

**Goal**: Single source of truth for creating domain objects. Used in seed data AND tests.

Files:
- `lib/factories/locker.factory.ts` — `createLocker(overrides?: Partial<Locker>): Locker`
  - Uses module-level counter to generate sequential `lockerNumber` values (`L-001`, `L-002`, …)
  - Uses `crypto.randomUUID()` for `id`
  - Defaults: `size: 'SMALL'`, `heldAt: null`, `status: 'AVAILABLE'`, `currentPackageId: null`
- `lib/factories/package.factory.ts` — `createPackage(overrides?: Partial<Package>): Package`
  - Defaults include `lockerNumber: null`

Default dimensions must match the seeding table in `plan.md`.

**TDD**: write factory tests — assert defaults (including `lockerNumber` format `/^L-\d{3}$/`), assert overrides win, assert IDs and lockerNumbers are unique per call.

**Done when**: Factories used in all tests instead of raw object literals; seed data imports from factories.

---

## Skill 2d — Allocation Strategy Interface

**Goal**: Decouple the allocation algorithm from `LockerService` so it can be swapped without modifying the service.

Files:
- `lib/strategies/allocation.strategy.ts`
  ```ts
  // Plain function type — no class or interface needed
  export type AllocationStrategy = (
    width: number, height: number, depth: number,
    candidates: Locker[],
  ) => Locker  // throws ParcelTooLargeError | LockerUnavailableError, never returns null
  ```
- `lib/strategies/best-fit.strategy.ts`
  ```ts
  export const bestFitByVolume: AllocationStrategy = (w, h, d, candidates) => {
    const volume = (l: Locker) => l.maxWidth * l.maxHeight * l.maxDepth
    const fitting = candidates.filter(l => l.maxWidth >= w && l.maxHeight >= h && l.maxDepth >= d)
    if (fitting.length === 0) throw new ParcelTooLargeError(`${w}×${h}×${d}`)
    // AVAILABLE only — HOLD and OCCUPIED are both excluded
    const available = fitting.filter(l => l.status === 'AVAILABLE')
    if (available.length === 0) throw new LockerUnavailableError()
    return available.sort((a, b) => volume(a) - volume(b))[0]
  }
  ```

**TDD** — write `best-fit.strategy.test.ts` before implementing:
```
✓ returns smallest fitting locker by volume
✓ throws ParcelTooLargeError when parcel exceeds all lockers
✓ throws LockerUnavailableError when fitting lockers exist but all OCCUPIED
✓ throws LockerUnavailableError when fitting lockers exist but all HOLD
✓ ignores OUT_OF_ORDER lockers
```

**Done when**: Strategy has 100% passing tests; `BestFitByVolumeStrategy` is the only place allocation logic lives.

---

## Skill 3 — In-Memory Repositories + Seed

**Goal**: Concrete implementations of the repository interfaces using in-memory Maps. These are used by the dev server AND by all unit/integration tests.

Files:
- `lib/repositories/in-memory/locker.repository.ts`
  ```ts
  export const createInMemoryLockerRepository = (
    store = new Map<string, Locker>()
  ): LockerRepository => ({
    findAll:      () => [...store.values()],
    findById:     (id) => store.get(id) ?? null,
    findAvailable:() => [...store.values()].filter(l => l.status === 'AVAILABLE'),
    findHeld:     () => [...store.values()].filter(l => l.status === 'HOLD'),
    findFitting:  (w, h, d) => [...store.values()].filter(
                    l => l.maxWidth >= w && l.maxHeight >= h && l.maxDepth >= d),
    save:         (l) => { store.set(l.id, l) },
    update:       (id, patch) => {
                    const l = store.get(id)
                    if (l) store.set(id, { ...l, ...patch })
                  },
  })
  ```
- `lib/repositories/in-memory/package.repository.ts` — same pattern, `createInMemoryPackageRepository`
- `lib/repositories/in-memory/notification.repository.ts` — `createInMemoryNotificationRepository`
- `lib/db/store.ts` — Bootstrap module: instantiates all repos with shared Maps, seeds lockers via `createLocker()` factory:
  - 5× SMALL  — `maxWidth: 30, maxHeight: 30, maxDepth: 40`
  - 5× MEDIUM — `maxWidth: 50, maxHeight: 50, maxDepth: 60`
  - 2× LARGE  — `maxWidth: 80, maxHeight: 80, maxDepth: 100`
  - All `AVAILABLE`
- Exports `resetStore()` for test teardown — clears all Maps and re-seeds

**TDD**: write repository tests before implementing — test `findFitting` dimension logic especially.

**Done when**: Importing `store.ts` gives pre-seeded repositories; `resetStore()` returns state to seed on each test run.

---

## Skill 4 — Code Service

**Goal**: Pickup code generation, hashing, and verification.

File: `lib/services/code.service.ts`

- `generateCode(): string` — 6-char hex via `crypto.randomBytes(3)`
- `hashCode(code: string): string` — SHA-256 hex digest
- `verifyCode(input: string, storedHash: string): boolean` — timing-safe compare

**Done when**: Unit-testable with no external deps. `verifyCode(generateCode(), hash)` returns true.

---

## Skill 5 — Notification Service

**Goal**: Mock SMS that logs to console and stores in the notification log.

File: `lib/services/notification.service.ts`

```ts
export type NotificationService = {
  send(phone: string, lockerNumber: string, code: string): void
}
```

- `send(phone, lockerNumber, code): void`
  - Formats: `"SMS → {phone}: Your package is in Locker {lockerNumber}. Code: {code}"`
  - `console.log` the message
  - Saves `{ id, recipientPhone, lockerNumber, message, sentAt }` to `notificationRepo`
- Note: the second parameter is `lockerNumber` (e.g. `"L-001"`)

**Done when**: Calling send appends to log and prints to console.

---

## Skill 6 — Locker Service

**Goal**: Thin orchestration layer — delegates data access to `ILockerRepository` and allocation logic to `AllocationStrategy`. Contains no business logic itself.

File: `lib/services/locker.service.ts`

```ts
const HOLD_TTL_MS = 10 * 60 * 1000  // 10 minutes

export const createLockerService = (repo: LockerRepository, strategy: AllocationStrategy) => ({
  getAllLockers:      ()                            => repo.findAll(),
  getAvailableLockers: ()                          => repo.findAvailable(),

  // Release any HOLD lockers whose heldAt is older than HOLD_TTL_MS
  releaseExpiredHolds: () => {
    const now = Date.now()
    repo.findHeld()
      .filter(l => l.heldAt && now - l.heldAt.getTime() > HOLD_TTL_MS)
      .forEach(l => repo.update(l.id, { status: 'AVAILABLE', heldAt: null }))
  },

  // Step 1 of deposit: atomically find + mark HOLD
  holdBestFit: (w: number, h: number, d: number) => {
    // releaseExpiredHolds must be called before this by the caller
    const locker = strategy(w, h, d, repo.findAll())
    repo.update(locker.id, { status: 'HOLD', heldAt: new Date() })
    return repo.findById(locker.id)!
  },

  // Step 2 of deposit: transition HOLD → OCCUPIED
  confirmOccupied: (id: string, pkgId: string) => {
    const locker = repo.findById(id)
    if (!locker || locker.status !== 'HOLD') throw new LockerNotHeldError()
    if (!locker.heldAt || Date.now() - locker.heldAt.getTime() > HOLD_TTL_MS) throw new HoldExpiredError()
    repo.update(id, { status: 'OCCUPIED', currentPackageId: pkgId, heldAt: null })
  },

  setLockerAvailable: (id: string) =>
    repo.update(id, { status: 'AVAILABLE', currentPackageId: null, heldAt: null }),
})

export type LockerService = ReturnType<typeof createLockerService>
```

**TDD** — write `locker.service.test.ts` with stub repository and stub strategy first:
```
✓ getAllLockers returns all lockers from repo
✓ releaseExpiredHolds releases only lockers held longer than 10 min
✓ releaseExpiredHolds does not release recently held lockers
✓ holdBestFit calls strategy then marks locker HOLD with heldAt timestamp
✓ confirmOccupied transitions HOLD → OCCUPIED and clears heldAt
✓ confirmOccupied throws LockerNotHeldError if locker is AVAILABLE or OCCUPIED
✓ confirmOccupied throws HoldExpiredError if heldAt is older than 10 min
✓ setLockerAvailable clears status, currentPackageId, and heldAt
```

Note: allocation correctness is tested in `best-fit.strategy.test.ts` (Skill 2d), not here.

**Done when**: Service tests pass using stub implementations; zero direct store or Map references in the service.

---

## Skill 7 — Package Service

**Goal**: Orchestrate deposit and pickup flows. Depends on injected services/repositories — no direct store or DB access.

File: `lib/services/package.service.ts`

```ts
export const createPackageService = (
  lockerService:       LockerService,
  packageRepo:         PackageRepository,
  notificationService: NotificationService,
) => ({
  depositPackage: (input: DepositInput): DepositResult => { ... },
  pickupPackage:  (inputCode: string):   PickupResult  => { ... },
})

export type PackageService = ReturnType<typeof createPackageService>
```

- `depositPackage(input: DepositInput): DepositResult`
  - `DepositInput`: `{ lockerId, lockerNumber, recipientName, recipientPhone, width, height, depth }`
  1. `codeService.generateCode()` + `codeService.hashCode()`
  2. Create Package via `packageRepo.save()` using `createPackage()` factory (stores `lockerId` + `lockerNumber`)
  3. `lockerService.confirmOccupied(lockerId, pkg.id)` — throws `LockerNotHeldError` or `HoldExpiredError` if invalid
  4. `notificationService.send(phone, lockerNumber, plaintextCode)`
  5. Return `{ pickupCode }` (only time plaintext leaves)

- `pickupPackage(inputCode: string): PickupResult`
  1. `codeService.hashCode(inputCode)` → look up package via `packageRepo.findByCodeHash()`
  2. If not found or status !== `STORED` → throw `InvalidCodeError`
  3. `packageRepo.update()` → status `RETRIEVED`, `retrievedAt: new Date()`
  4. `lockerService.setLockerAvailable(lockerId)`
  5. Return `{ lockerId, lockerNumber }`

**TDD** — write `package.service.test.ts` with full stub injections before implementing:
```
✓ depositPackage returns pickupCode on success
✓ depositPackage propagates LockerNotHeldError from lockerService
✓ depositPackage propagates HoldExpiredError from lockerService
✓ depositPackage calls notificationService.send with lockerNumber
✓ pickupPackage sets package RETRIEVED and locker AVAILABLE
✓ pickupPackage returns lockerId and lockerNumber
✓ pickupPackage throws InvalidCodeError for wrong code
✓ pickupPackage throws InvalidCodeError if already RETRIEVED
```

**Done when**: All tests pass with stub dependencies; full round-trip integration test passes against real in-memory repos.

---

## Skill 8 — Zod Validators

**Goal**: Input schemas for all API routes.

Files:
- `lib/validators/hold.schema.ts` ← new
  ```ts
  z.object({
    width:  z.number().positive(),
    height: z.number().positive(),
    depth:  z.number().positive(),
  })
  ```
- `lib/validators/deposit.schema.ts` ← requires `lockerId` + `lockerNumber`
  ```ts
  z.object({
    lockerId:       z.uuid(),
    lockerNumber:   z.string().min(1),
    recipientName:  z.string().min(1),
    recipientPhone: z.string().min(7),
    width:          z.number().positive(),   // cm — stored on Package for record
    height:         z.number().positive(),
    depth:          z.number().positive(),
  })
  ```
- `lib/validators/pickup.schema.ts`
  ```ts
  z.object({ pickupCode: z.string().length(6) })
  ```

**Done when**: Schemas reject bad input with typed errors.

---

## Skill 9 — API Route Handlers

**Goal**: Wire services to HTTP endpoints.

Files:
- `lib/errors/handler.ts` — shared `handleError(err): Response` function; catches all `AppError` subclasses by type
- `app/api/lockers/route.ts` — `GET`: list lockers (optional `?status=` / `?size=` filters)
- `app/api/lockers/hold/route.ts` — `POST`: validate hold body, call `releaseExpiredHolds()` then `holdBestFit()`, return `{ lockerId, lockerNumber, lockerSize, holdExpiresAt }`
- `app/api/packages/deposit/route.ts` — `POST`: validate deposit body, call `depositPackage()`, return `{ pickupCode }`
- `app/api/packages/pickup/route.ts` — `POST`: validate pickup body, call `pickupPackage()`, return `{ lockerId, lockerNumber, message }`
- `app/api/notifications/route.ts` — `GET`: return all notification logs via `notificationRepo.findAll()`

Error handling pattern (all routes use `handleError` from `lib/errors/handler.ts`):
- `400` for Zod validation failures
- `409` for `LockerUnavailableError` or `LockerNotHeldError`
- `410` for `HoldExpiredError` (hold timed out, agent must re-hold)
- `422` for `ParcelTooLargeError`
- `404` for `InvalidCodeError`
- Unhandled errors re-thrown to Next.js

Also create API client modules used by all UI components:
- `lib/services/api/locker.api.ts` — `fetchAll(params?)`, `hold(w, h, d)`
- `lib/services/api/package.api.ts` — `deposit(input)`, `pickup(code)`
- `lib/services/api/notification.api.ts` — `fetchAll()`

Each client module translates HTTP status codes into typed error messages before throwing.

**Done when**: All endpoints work correctly via curl; client modules handle all error statuses.

---

## Skill 10 — Agent Dashboard UI

**Goal**: Agent-facing page to deposit a package.

File: `app/(agent)/dashboard/page.tsx` + `components/DepositForm.tsx`

Two-step flow:

Uses `lockerApi` and `packageApi` from `lib/services/api/` — no raw `fetch()` calls in components.

**Step 1 — Reserve** (shown first)
- Form fields: Width (cm), Height (cm), Depth (cm)
- On submit: `lockerApi.hold(w, h, d)`
- On success: show "Locker `{lockerSize}` reserved. You have 10 minutes to load the package." Store `{ lockerId, lockerNumber }` in component state.
- On error: display the message thrown by `lockerApi` (409 / 422 mapped to user-friendly strings)

**Step 2 — Confirm Deposit** (shown after successful hold)
- Additional fields: Recipient Name, Recipient Phone
- On submit: `packageApi.deposit({ lockerId, lockerNumber, ...dims, ...recipient })`
- On success: show `Pickup Code` prominently (SMS also sent to recipient)
- On error:
  - 409 → "Hold no longer valid. Please reserve a locker again."
  - 410 → "Hold expired (10 min limit). Please reserve a locker again." (auto-resets to Step 1)
- Below form: show `LockerGrid` component

**Done when**: Full deposit flow works in the browser.

---

## Skill 11 — Customer Kiosk UI

**Goal**: Customer-facing page to pick up a package.

File: `app/(customer)/kiosk/page.tsx` + `components/PickupForm.tsx`

- Single input: Pickup Code (6 chars, auto-uppercased, non-hex chars stripped, submit disabled until length === 6)
- On submit: `packageApi.pickup(code)`
- On success: show locker number prominently (e.g. `L-001`) — "Locker is now open — please collect your package"
- On error: display message from `packageApi` (404 → "Invalid code. Please check your notification and try again.")

**Done when**: Full pickup flow works in the browser using a code from a deposit.

---

## Skill 12 — Locker Grid Component

**Goal**: Visual overview of all lockers and their status.

File: `components/LockerGrid.tsx`

- Client component (`'use client'`) — uses `lockerApi.fetchAll()`, auto-refreshes every 5 seconds
- Renders a grid of locker cards, color-coded:
  - `AVAILABLE` → green
  - `HOLD` → blue (with countdown timer: minutes remaining until 10-min hold expires)
  - `OCCUPIED` → amber
  - `OUT_OF_ORDER` → red
- Each card shows: locker number (e.g. `L-001`), size badge, max dimensions (W×H×D cm), status chip

Used on Agent Dashboard, Admin page.

---

## Skill 13 — Admin Page

**Goal**: System-level overview.

Files:
- `app/admin/page.tsx` — server component shell; renders three client components
- `components/OccupancySummary.tsx` — live occupied / on-hold / available counts; fetches `lockerApi.fetchAll()`, refreshes every 5s
- `components/NotificationLog.tsx` — auto-refreshing table fetching `notificationApi.fetchAll()`, newest first; columns: Phone, Locker Number, Sent At, Message

The page itself has no server-side data fetching — all live data is in the client components so the grid and log refresh without a full page reload.

**Done when**: Admin page shows real-time locker state, live occupancy counts, and all past notifications.

---

## Skill 14 — PostgreSQL + Prisma (Phase 6)

**Goal**: Swap in-memory repositories for Prisma-backed ones. Zero service or strategy changes required — this is the payoff of the Repository Pattern.

- `npm install prisma @prisma/client`
- `npx prisma init --datasource-provider postgresql`
- Set `DATABASE_URL` in `.env` — never commit this file
- Define Prisma schema — `Locker`, `Package`, `NotificationLog` models:
  - `Locker`: `maxWidth Int`, `maxHeight Int`, `maxDepth Int`
  - `Package`: `width Int`, `height Int`, `depth Int`; no `packageSize`
- `npx prisma migrate dev --name init`
- Implement `lib/repositories/prisma/locker.repository.ts` — `PrismaLockerRepository implements ILockerRepository`
  - `findFitting`: `prisma.locker.findMany({ where: { status: 'AVAILABLE', maxWidth: { gte: w }, maxHeight: { gte: h }, maxDepth: { gte: d } } })`
  - Sort by computed volume in app layer (Prisma doesn't support computed ORDER BY natively without raw query)
- Implement `PrismaPackageRepository`, `PrismaNotificationRepository`
- Replace injected repos in `store.ts` bootstrap with Prisma implementations
- Seed via `prisma/seed.ts` using `createLocker()` factory

**Done when**: Data survives server restarts; no service/strategy files were modified during this skill.

---

## Skill 15 — Storage Charges

**Goal**: Calculate the storage fee owed for a package based on how long it has been in the locker. Base amount and tier multipliers are configurable.

Files:
- `lib/config/storage-charges.ts` — exported config type and default values:
  ```ts
  export type StorageChargeConfig = {
    baseAmountPerDay: number
    tiers: Array<{ upToDay: number | null; multiplier: number }>
  }

  export const defaultStorageChargeConfig: StorageChargeConfig = {
    baseAmountPerDay: 0.50,
    tiers: [
      { upToDay: 5,    multiplier: 1 },  // days 1–5:  $0.50/day
      { upToDay: 10,   multiplier: 2 },  // days 6–10: $1.00/day
      { upToDay: null, multiplier: 3 },  // days 11+:  $1.50/day
    ],
  }
  ```
- `lib/services/storage-charge.service.ts` — pure function:
  ```ts
  calculateStorageCharge(
    createdAt: Date,
    now: Date = new Date(),
    config: StorageChargeConfig = defaultStorageChargeConfig,
  ): StorageChargeResult
  // Returns: { days, totalCharge, breakdown: TierBreakdown[], config }
  ```
  - Minimum charge is 1 day (even if stored less than 24h)
  - `breakdown` lists days, multiplier, ratePerDay, and subtotal for each tier

**TDD** — write `storage-charge.service.test.ts` first:
```
✓ 1 day charges 1× base ($0.50)
✓ 5 days charges 5×1× ($2.50)
✓ 6 days charges 5×1× + 1×2× ($3.50)
✓ 10 days charges 5×1× + 5×2× ($7.50)
✓ 12 days charges 5×1× + 5×2× + 2×3× ($10.50)
✓ returns breakdown array with correct subtotals per tier
✓ custom config: different base amount
✓ custom config: different multipliers
✓ accepts explicit `now` for deterministic testing
✓ minimum 1 day even if just deposited
✓ uses defaultStorageChargeConfig when no config provided
```

**Done when**: Pure calculation function passes all tests with both default and custom configs. No API route or UI required in this phase — the service is a foundation for billing integration.
