import type { Locker, LockerSize, LockerStatus } from '@/lib/models/locker'

export type LockerFilters = {
  status?: LockerStatus
  size?: LockerSize
}

export type LockerRepository = {
  findAll(filters?: LockerFilters): Promise<Locker[]>
  findById(id: string): Promise<Locker | null>
  findAvailable(): Promise<Locker[]>
  findHeld(): Promise<Locker[]>
  findFitting(w: number, h: number, d: number): Promise<Locker[]>
  save(locker: Locker): Promise<void>
  update(id: string, patch: Partial<Locker>): Promise<void>
}
