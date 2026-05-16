import type { Locker } from '@/lib/models/locker'

export type LockerRepository = {
  findAll(): Promise<Locker[]>
  findById(id: string): Promise<Locker | null>
  findAvailable(): Promise<Locker[]>
  findHeld(): Promise<Locker[]>
  findFitting(w: number, h: number, d: number): Promise<Locker[]>
  save(locker: Locker): Promise<void>
  update(id: string, patch: Partial<Locker>): Promise<void>
}
