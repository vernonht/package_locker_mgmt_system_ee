import type { Locker } from '@/lib/models/locker'

export type LockerRepository = {
  findAll(): Locker[]
  findById(id: string): Locker | null
  findAvailable(): Locker[]
  findHeld(): Locker[]
  findFitting(w: number, h: number, d: number): Locker[]
  save(locker: Locker): void
  update(id: string, patch: Partial<Locker>): void
}
