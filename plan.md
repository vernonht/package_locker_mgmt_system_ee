# Package Locker Management System — Technical Plan

## Engineering Guardrails

See `guardrails.md` for the full rules. Summary:
- **SOLID** — each service has one job; depend on interfaces not concrete classes
- **TDD** — tests written before implementation; every service method has a test
- **Repository Pattern** — services never touch the store or DB directly
- **Strategy Pattern** — allocation algorithm is injected, not hardcoded
- **Custom Error Hierarchy** — typed errors (`ParcelTooLargeError`, `LockerUnavailableError`, `LockerNotHeldError`, `HoldExpiredError`, `InvalidCodeError`) caught by status code in route handlers
- **Factory Functions** — for creating domain objects in seed data and tests

---

## Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Storage (MVP)**: In-memory singleton (Map)
- **Storage (Phase 5)**: PostgreSQL via Prisma
- **Crypto**: Node.js built-in `crypto` module

---

## Project Structure

```
/app
  /api
    /lockers/route.ts              GET — list lockers (filterable)
    /packages
      /deposit/route.ts            POST — agent deposits package
      /pickup/route.ts             POST — customer picks up with code
  /(agent)
    /dashboard/page.tsx            Agent UI
  /(customer)
    /kiosk/page.tsx                Customer kiosk UI
  /admin
    /page.tsx                      Admin locker grid + notification log

/lib
  /errors.ts                       Typed error hierarchy (AppError subclasses)
  /models
    /locker.ts                     Locker type + LockerSize + LockerStatus enums
    /package.ts                    Package type + PackageStatus enum
    /notification.ts               Notification log type
  /repositories
    /interfaces
      /locker.repository.ts        ILockerRepository interface (LockerReader + LockerWriter)
      /package.repository.ts       IPackageRepository interface
      /notification.repository.ts  INotificationRepository interface
    /in-memory
      /locker.repository.ts        InMemoryLockerRepository (implements interface)
      /package.repository.ts       InMemoryPackageRepository
      /notification.repository.ts  InMemoryNotificationRepository
    /prisma
      /locker.repository.ts        PrismaLockerRepository (Phase 6)
      /package.repository.ts       PrismaPackageRepository (Phase 6)
  /factories
    /locker.factory.ts             createLocker(overrides?) — used in seed + tests
    /package.factory.ts            createPackage(overrides?)
  /strategies
    /allocation.strategy.ts        AllocationStrategy interface
    /best-fit.strategy.ts          BestFitByVolumeStrategy (default)
  /services
    /locker.service.ts             Allocation orchestration — depends on ILockerRepository + AllocationStrategy
    /package.service.ts            Deposit + pickup orchestration — depends on all repositories + services
    /code.service.ts               Code generation + hashing + verification (pure functions, no deps)
    /notification.service.ts       INotificationService interface + MockNotificationService
  /validators
    /deposit.schema.ts             Zod: DepositRequest
    /pickup.schema.ts              Zod: PickupRequest
  /db
    /store.ts                      Bootstrap: wires InMemory repositories + seeds via locker.factory

/components
  /LockerGrid.tsx                  Visual locker status grid
  /DepositForm.tsx                 Agent deposit form
  /PickupForm.tsx                  Customer code entry form
  /NotificationLog.tsx             Admin SMS log table
```

---

## Data Models

### Locker
```ts
type LockerSize   = 'SMALL' | 'MEDIUM' | 'LARGE'
type LockerStatus = 'AVAILABLE' | 'HOLD' | 'OCCUPIED' | 'OUT_OF_ORDER'

interface Locker {
  id: string            // UUID
  size: LockerSize      // label for display; actual capacity is the dimension fields
  maxWidth: number      // cm
  maxHeight: number     // cm
  maxDepth: number      // cm
  status: LockerStatus
  currentPackageId: string | null
  heldAt: Date | null   // timestamp when HOLD was set; null if not held
}
```

`HOLD` is a short-lived reservation set when an agent requests a locker. It prevents concurrent agents from being allocated the same locker while the first agent walks to it and loads the package. Holds auto-expire after **10 minutes** — the locker returns to `AVAILABLE` if deposit is never confirmed.

Default locker dimensions used for seeding:
| Size   | maxWidth | maxHeight | maxDepth | Interior volume |
|--------|----------|-----------|----------|-----------------|
| SMALL  | 30 cm    | 30 cm     | 40 cm    | 36,000 cm³      |
| MEDIUM | 50 cm    | 50 cm     | 60 cm    | 150,000 cm³     |
| LARGE  | 80 cm    | 80 cm     | 100 cm   | 640,000 cm³     |

### Package
```ts
type PackageStatus = 'PENDING_DEPOSIT' | 'STORED' | 'RETRIEVED' | 'EXPIRED'

interface Package {
  id: string
  recipientName: string
  recipientPhone: string
  width: number             // cm — actual parcel dimensions entered by agent
  height: number            // cm
  depth: number             // cm
  pickupCodeHash: string    // SHA-256 hash — never store plaintext
  status: PackageStatus
  lockerId: string | null
  createdAt: Date
  retrievedAt: Date | null
}
```

### Notification
```ts
interface NotificationLog {
  id: string
  recipientPhone: string
  lockerId: string
  sentAt: Date
  message: string           // full mock SMS text
}
```

---

## Service Logic

### Locker Allocation (locker.service.ts)

Agent inputs actual parcel dimensions (width × height × depth in cm). The system checks every `AVAILABLE` locker to see if the parcel physically fits, then picks the tightest match.

**Fit check**: a locker fits when all three dimensions satisfy:
```
locker.maxWidth >= parcel.width
locker.maxHeight >= parcel.height
locker.maxDepth >= parcel.depth
```

**Selection**: among all fitting available lockers, sort by interior volume ascending (`maxW × maxH × maxD`) and take the smallest — this is best-fit by volume, not by size label.

**Allocation only considers `AVAILABLE` lockers** — `HOLD` and `OCCUPIED` are both excluded from candidates.

Before running allocation, release any `HOLD` lockers whose `heldAt` is older than 10 minutes (`releaseExpiredHolds()`). This is called lazily at the start of every hold request.

**Error distinction**:
```
No available locker fits the dimensions
  └─ Some locker sizes could fit but are all OCCUPIED or HOLD → 409 LockerUnavailableError
  └─ Parcel is larger than every locker in the system      → 422 ParcelTooLargeError
```

### Code Generation (code.service.ts)

```ts
generate() → crypto.randomBytes(3).toString('hex').toUpperCase()  // e.g. "A3F9C1"
hash(code)  → crypto.createHash('sha256').update(code).digest('hex')
verify(code, hash) → timingSafeEqual(Buffer.from(hash(code)), Buffer.from(storedHash))
```

### Deposit Flow — Two Steps

#### Step 1: Hold (locker.service.ts → holdBestFit)

Agent submits parcel dimensions to reserve a locker before walking to it.

1. Call `releaseExpiredHolds()` — lazily free any stale holds
2. Run `bestFitByVolume(w, h, d, availableLockers)` (AVAILABLE only, excludes HOLD)
3. Mark locker `HOLD`, set `heldAt: new Date()`
4. Return `{ lockerId, lockerSize, holdExpiresAt }` to agent

#### Step 2: Confirm Deposit (package.service.ts → depositPackage)

Agent physically loads the package and confirms.

1. Look up locker by `lockerId`
2. If status is not `HOLD` → throw `LockerNotHeldError`
3. If `heldAt < now - 10 min` → throw `HoldExpiredError` (agent must hold again)
4. Generate + hash pickup code
5. Create Package record via `packageRepo.save()`
6. Mark locker `OCCUPIED`, clear `heldAt`, set `currentPackageId`
7. Call `notificationService.send(phone, lockerId, plaintextCode)`
8. Return `{ pickupCode }` (only time plaintext code is returned)

### Pickup Flow (package.service.ts → pickupPackage)

1. Find `OCCUPIED` locker whose package has a matching code hash
2. `verify(inputCode, package.pickupCodeHash)` — reject if mismatch
3. Mark Package `RETRIEVED`, set `retrievedAt`
4. Mark Locker `AVAILABLE`, set `currentPackageId = null`
5. Return success

---

## API Contract

### `GET /api/lockers`
Query params: `?status=AVAILABLE&size=MEDIUM` (both optional)
Response: `Locker[]`

### `POST /api/lockers/hold`  ← new
```json
Request:  { "width": 25, "height": 20, "depth": 15 }
Response: { "lockerId": "uuid", "lockerSize": "SMALL", "holdExpiresAt": "ISO8601" }
Errors:   409 No lockers available | 422 Parcel too large | 400 Validation error
```

### `POST /api/packages/deposit`  ← updated
```json
Request:  {
  "lockerId": "uuid",
  "recipientName": "Jane",
  "recipientPhone": "+60123456789",
  "width": 25,
  "height": 20,
  "depth": 15
}
Response: { "pickupCode": "A3F9C1" }
Errors:   409 Locker not held | 410 Hold expired (re-hold required) | 400 Validation error
```

### `POST /api/packages/pickup`
```json
Request:  { "pickupCode": "A3F9C1" }
Response: { "lockerId": "uuid", "message": "Package retrieved successfully" }
Errors:   404 Invalid code | 400 Validation error
```

---

## Locker Status State Machine

```
AVAILABLE ──hold──▶ HOLD ──confirm deposit──▶ OCCUPIED ──pickup──▶ AVAILABLE
    ▲                │                                                   │
    │                └──── hold expires (10 min) / agent cancels ────────┘
    └───────────────────────────────────────────────────────────────────┘

Any state ──admin──▶ OUT_OF_ORDER
```

**Only `AVAILABLE` lockers are candidates for allocation.** `HOLD` lockers are reserved but not yet occupied — they appear "taken" to other agents until released.

---

## In-Memory Store (lib/db/store.ts)

Module-level singleton — persists across requests in dev server. Replaced by PostgreSQL in Phase 5.

```ts
const lockers   = new Map<string, Locker>()
const packages  = new Map<string, Package>()
const notifications: NotificationLog[] = []
```

Seed with a default locker set on first import (dimensions match table in Data Models section):
- 3× SMALL  (30×30×40 cm) — all AVAILABLE
- 3× MEDIUM (50×50×60 cm) — all AVAILABLE
- 2× LARGE  (80×80×100 cm) — all AVAILABLE

---

## Phase Plan

| Phase | Scope | Key Files |
|-------|-------|-----------|
| 1 | Models + in-memory store + seed data | `lib/models/*`, `lib/db/store.ts` |
| 2 | Service layer (locker, package, code, notification) | `lib/services/*` |
| 3 | API route handlers + Zod validation | `app/api/**` |
| 4 | Agent Dashboard + Customer Kiosk UI | `app/(agent)`, `app/(customer)`, `components/*` |
| 5 | Admin page + notification log | `app/admin`, `NotificationLog.tsx` |
| 6 | PostgreSQL/Prisma swap + 48h timeout + edge cases | `prisma/schema.prisma`, cron job |

---

## Edge Cases to Handle

| Scenario | Handling |
|----------|----------|
| Parcel larger than all lockers | 422 `ParcelTooLargeError` — tell agent the max locker dimensions |
| Fitting lockers exist but all OCCUPIED or HOLD | 409 `LockerUnavailableError` — distinct from too-large |
| Agent confirms deposit but locker is not HOLD | 409 `LockerNotHeldError` — agent must call hold first |
| Agent confirms deposit but hold expired (>10 min) | 410 `HoldExpiredError` — agent must re-hold |
| Two agents hold simultaneously | Second agent gets a different AVAILABLE locker; `HOLD` is set atomically before returning |
| Wrong pickup code | 404 generic error (don't reveal if locker exists) |
| Code reuse after pickup | Package status `RETRIEVED` — reject immediately |
| Package not picked up (48h) | Phase 6: cron/scheduled job resets locker, marks package `EXPIRED` |
| All lockers OUT_OF_ORDER | Treated same as fully occupied — 409 |
| Hold never confirmed, expires | `releaseExpiredHolds()` run lazily on next hold request; locker returns to `AVAILABLE` |
