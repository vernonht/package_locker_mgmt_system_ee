import type { Locker } from '@/lib/models/locker'
import type { LockerRepository } from '@/lib/repositories/interfaces/locker.repository'

export const createInMemoryLockerRepository = (
  store = new Map<string, Locker>(),
): LockerRepository => ({
  findAll:      () => [...store.values()],
  findById:     (id) => store.get(id) ?? null,
  findAvailable:() => [...store.values()].filter(l => l.status === 'AVAILABLE'),
  findHeld:     () => [...store.values()].filter(l => l.status === 'HOLD'),
  findFitting:  (w, h, d) =>
    [...store.values()].filter(l => l.maxWidth >= w && l.maxHeight >= h && l.maxDepth >= d),
  save:         (l) => { store.set(l.id, l) },
  update:       (id, patch) => {
    const l = store.get(id)
    if (l) store.set(id, { ...l, ...patch })
  },
})
