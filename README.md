# Package Locker Management System

A full-stack parcel locker system built with **Next.js 16** (App Router), **TypeScript** (strict), and **Tailwind CSS v4**, backed by **PostgreSQL** via **Prisma 7**.

---

## Approach

### Spec-Driven Development

The system was designed from the outside in. Each feature started with a written contract — what the API accepts, what it returns, and under what conditions it fails — before any code was written. This kept the domain model honest: if a concept was hard to spec (e.g. "what does a partial deposit look like?"), that was a signal to simplify the design rather than patch it with edge-case handling.

The result is a small, intentional domain:

- **Lockers** move through a strict state machine: `AVAILABLE → HOLD → OCCUPIED → AVAILABLE`
- **Packages** have a parallel lifecycle: `STORED → RETRIEVED`
- **Pickup codes** are the single source of truth for customer identity at retrieval
- **Storage charges** are calculated once, at pickup, against config that lives in the database so pricing can change without a deploy

### Test-Driven Development

Tests were written before or alongside each feature, not after. The 91 tests cover:

| Layer | Tests | What they verify |
|---|---|---|
| Validators | 16 | Schema acceptance/rejection boundaries |
| Factories | 6 | Default field values and overrides |
| Repository (in-memory) | 8 | CRUD contracts all implementations must honour |
| Code service | 6 | Generation uniqueness, hash determinism, timing-safe verify |
| Best-fit strategy | 5 | Correct selection across sizes, ties, and no-fit cases |
| Locker service | 13 | State transitions, HOLD TTL, sequential number assignment |
| Package service | 9 | Deposit, pickup, error propagation |
| Pickup preview service | 7 | Charge calculation, no state mutation, wrong-locker rejection |
| Storage charge service | 11 | Tier math, minimum day, custom config |
| Notification service | 5 | Provider dispatch, failure resilience, log persistence |
| Errors | 5 | `instanceof` hierarchy, HTTP code mapping |

Tests run entirely in-memory — **no database required**. The in-memory repositories satisfy the same async interface as the Prisma repositories, so services are tested in isolation with zero I/O.

---

## Architecture

```
lib/
  models/          — TypeScript interfaces: Locker, Package, NotificationLog
  errors.ts        — AppError subclass hierarchy (class used only here for instanceof)
  config/          — StorageChargeConfig type + hardcoded defaults
  factories/       — createLocker(), createPackage() — deterministic object construction
  repositories/
    interfaces/    — LockerRepository, PackageRepository, NotificationRepository,
                     StorageChargeConfigRepository — all methods return Promise<T>
    in-memory/     — Map/array-backed implementations (tests, no-DB dev)
    prisma/        — Prisma-backed implementations
  strategies/
    allocation.strategy.ts     — AllocationStrategy function type
    best-fit.strategy.ts       — Smallest-fitting locker by volume
  services/
    locker.service.ts          — State transitions, HOLD TTL, locker creation
    package.service.ts         — Deposit, pickup, pickup preview
    code.service.ts            — Generate / hash / verify pickup codes
    notification/
      notification.service.ts  — Provider dispatch + log persistence
      notification.provider.ts — NotificationProvider interface
      providers/               — sms, email, whatsapp (mock console implementations)
    storage-charge.service.ts  — Pure charge calculation (days × tiered rate)
    api/                       — Client-side fetch wrappers (lockerApi, packageApi, notificationApi)
  validators/      — Zod schemas for every API route
  db/
    index.ts        — Swap point: export from prisma-store or store
    prisma-store.ts — Prisma composition root
    store.ts        — In-memory composition root (seeds 12 lockers on startup)
    prisma.ts       — Singleton PrismaClient via globalThis
prisma/
  schema.prisma    — Locker, Package, NotificationLog, StorageChargeConfig, StorageChargeTier
  seed.ts          — Seeds 12 lockers + default storage charge config
```

### Key design decisions

**Factory functions, not classes.** Every service is a plain object returned by `createXxx(deps)`. No `this`, no inheritance, no mock setup friction. Dependencies are injected at construction time, making tests a matter of passing stubs.

**Repository pattern with a single swap point.** Services depend on repository interfaces, never on Prisma or Maps directly. Changing one line in `lib/db/index.ts` switches the entire application between in-memory and Prisma modes. This is what makes the test suite database-free.

**All repositories are async by contract.** Both the in-memory implementations (which wrap `Promise.resolve`) and the Prisma implementations satisfy the same interface. This prevents services from ever accidentally relying on synchronous behaviour — a bug that would only appear in production.

**Strategy pattern for allocation.** The allocation algorithm (`best-fit.strategy.ts`) is a plain function injected into `LockerService`. Swapping to a different algorithm (round-robin, random, priority-by-size) requires no changes to the service.

**`class` only in `lib/errors.ts`.** `instanceof` checks in catch blocks require real classes. Every other abstraction uses plain objects and function types.

**HOLD state prevents race conditions.** The two-step deposit flow (reserve → confirm) means two agents cannot be assigned the same locker simultaneously. A HOLD auto-expires after 10 minutes if the deposit is never confirmed.

**Storage charges in the database.** Base rate and tier multipliers are stored in `storage_charge_configs` and `storage_charge_tiers`, not hardcoded. Admins can adjust pricing with a SQL update and changes take effect immediately — no redeploy needed.

**Pickup requires both locker number and pickup code.** A 6-character hex code has ~16.7 million combinations, which is adequate but not enormous for a single station. Requiring the locker number as a second factor reduces the effective brute-force surface and is a natural UX check — the customer is standing in front of the locker they want to open.

**Pluggable notification providers.** `NotificationService` accepts an array of `NotificationProvider` implementations. Adding a real SMS gateway (Twilio, AWS SNS) means creating one new file and adding it to the providers array in `lib/db/store.ts` or `lib/db/prisma-store.ts`. The service logs which provider handled each notification.

---

## Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| Storage charges in DB | Runtime pricing changes without redeploy | DB seeding required; no admin UI for config |
| In-memory fallback | Tests and local dev need no database | In-memory state lost on restart |
| Two-factor pickup (code + locker number) | Reduces brute-force risk | Extra step for the customer |
| Console-only notification providers | No external credentials needed to run locally | Nothing is actually sent |
| No authentication | Simple to run and demonstrate | Any user can access any page |

---

## Assumptions

1. **Single station.** All lockers are at one physical location. Multi-site routing is out of scope.
2. **Locker numbers follow `L-NNN` format.** Numbers are assigned sequentially, derived from the highest existing number in the database. Non-conforming legacy numbers (not matching `L-\d+`) are ignored when computing the next number.
3. **Storage fee is calculated at pickup, not deposit.** Customers are charged for the days their parcel occupied the locker. A package picked up on the same day it was deposited is charged for 1 day (minimum).
4. **No real payment integration.** The "Pay & Open Locker" button on the customer kiosk is a UI flow checkpoint only. Actual payment processing is not implemented.
5. **Notification providers are mocked.** `smsProvider`, `emailProvider`, and `whatsappProvider` log to the console. They record the provider name in the notification log so the log reflects which channel was used.
6. **Phone numbers are stored as-entered.** Zod validates that `recipientPhone` is a non-empty string; it does not enforce E.164 format or dial-code prefix.
7. **No access control.** Agent, customer, and admin dashboards are open routes. Authentication and authorisation are outside the scope of this implementation.
8. **Prisma is the production store; in-memory is for tests and local prototyping.** The in-memory store is seeded with 12 lockers on startup. The Prisma store requires a migration and seed run before first use.

---

## Pages

| URL | Audience | Purpose |
|-----|----------|---------|
| `/dashboard` | Agent | Deposit packages — two steps: reserve by dimensions, then confirm with recipient details |
| `/kiosk` | Customer | Enter locker number + 6-char pickup code; view storage fee; retrieve package |
| `/admin` | Admin | Add lockers, live locker grid, occupancy stats, notification log |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/lockers` | List lockers (`?status=` / `?size=` filters) |
| `POST` | `/api/lockers` | Create a new locker |
| `POST` | `/api/lockers/hold` | Reserve a locker by parcel dimensions |
| `POST` | `/api/packages/deposit` | Confirm package deposit into a held locker |
| `POST` | `/api/packages/pickup/preview` | Calculate storage fee (no state change) |
| `POST` | `/api/packages/pickup` | Retrieve a package using locker number + pickup code |
| `GET` | `/api/notifications` | List all SMS notification logs |

### Create a locker
```json
POST /api/lockers
{ "size": "MEDIUM", "maxWidth": 50, "maxHeight": 50, "maxDepth": 60 }

201: { "id": "uuid", "lockerNumber": "L-013", "size": "MEDIUM", ... }
400: Validation error
```

### Hold a locker
```json
POST /api/lockers/hold
{ "width": 25, "height": 20, "depth": 15 }

200: { "lockerId": "uuid", "lockerNumber": "L-001", "lockerSize": "SMALL", "holdExpiresAt": "ISO8601" }
409: No lockers available
422: Parcel too large
```

### Confirm deposit
```json
POST /api/packages/deposit
{ "lockerId": "uuid", "lockerNumber": "L-001", "recipientName": "Jane", "recipientPhone": "+60123456789", "width": 25, "height": 20, "depth": 15 }

200: { "lockerId": "uuid", "lockerNumber": "L-001" }
409: Locker not held
410: Hold expired (re-hold required)
```

### Preview storage charge
```json
POST /api/packages/pickup/preview
{ "pickupCode": "A3F9C1", "lockerNumber": "L-001" }

200: { "days": 3, "totalCharge": 1.50, "breakdown": [...], "lockerNumber": "L-001" }
404: Invalid code or locker number
```

### Confirm pickup
```json
POST /api/packages/pickup
{ "pickupCode": "A3F9C1", "lockerNumber": "L-001" }

200: { "lockerId": "uuid", "lockerNumber": "L-001", "message": "Package retrieved successfully" }
404: Invalid code or locker number
```

---

## Locker State Machine

```
AVAILABLE ──hold──▶ HOLD ──confirm deposit──▶ OCCUPIED ──pickup──▶ AVAILABLE
               │                                                        │
               └──── hold expires (10 min) ──────────────────────────▶ ┘
```

## Default Locker Seed

| Size | Dimensions (W×H×D cm) | Count |
|------|-----------------------|-------|
| SMALL | 30×30×40 | 5 |
| MEDIUM | 50×50×60 | 5 |
| LARGE | 80×80×100 | 2 |

## Storage Charge Config

Rates are stored in `storage_charge_configs` + `storage_charge_tiers` and applied at pickup. The calculation service is a pure function — it takes `(depositedAt, now, config)` and returns a breakdown with no side effects, making it trivially testable with fixed dates.

Default values:

| Day range | Multiplier | Rate |
|-----------|------------|------|
| Days 1–5 | 1× | $0.50 / day |
| Days 6–10 | 2× | $1.00 / day |
| Days 11+ | 3× | $1.50 / day |

Minimum charge: 1 day regardless of actual time stored.

To adjust pricing without a redeploy:

```sql
-- Change base rate
UPDATE storage_charge_configs SET "baseAmountPerDay" = 1.00;

-- Change a tier multiplier (sortOrder: 0 = tier 1, 1 = tier 2, 2 = tier 3)
UPDATE storage_charge_tiers SET multiplier = 1.5 WHERE "sortOrder" = 0;
```

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (`strict: true`)
- **Styling**: Tailwind CSS v4
- **Validation**: Zod
- **ORM**: Prisma 7.8 with `@prisma/adapter-pg`
- **Database**: PostgreSQL
- **Testing**: Jest + ts-jest (91 tests, no database required)
- **Crypto**: Node.js built-in (`randomBytes`, SHA-256, `timingSafeEqual`)

---

## Running Locally

### In-memory mode (no database)

```ts
// lib/db/index.ts — switch to:
export * from '@/lib/db/store'
// export * from '@/lib/db/prisma-store'
```

```bash
npm install
npm run dev     # http://localhost:3000
```

### PostgreSQL mode

```bash
# 1. Create database
createdb locker_mgmt

# 2. Set connection string
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/locker_mgmt"' > .env

# 3. Run migrations and seed
npx prisma migrate deploy
npm run db:seed

# 4. Switch lib/db/index.ts to export from prisma-store
npm run dev
```

### Tests

```bash
npm test           # 91 tests — Jest + ts-jest, in-memory only, no database
npm run test:watch
```
