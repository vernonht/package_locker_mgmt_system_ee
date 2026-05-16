import type { Locker } from '@/lib/models/locker'
import type { LockerRepository } from '@/lib/repositories/interfaces/locker.repository'

export const createInMemoryLockerRepository = (
  store = new Map<string, Locker>(),
): LockerRepository => ({
  findAll:      () => Promise.resolve([...store.values()]),
  findById:     (id) => Promise.resolve(store.get(id) ?? null),
  findAvailable:() => Promise.resolve([...store.values()].filter(l => l.status === 'AVAILABLE')),
  findHeld:     () => Promise.resolve([...store.values()].filter(l => l.status === 'HOLD')),
  findFitting:  (w, h, d) => Promise.resolve(
    [...store.values()].filter(l => l.maxWidth >= w && l.maxHeight >= h && l.maxDepth >= d)
  ),
  save:   (l) => { store.set(l.id, l); return Promise.resolve() },
  update: (id, patch) => {
    const l = store.get(id)
    if (l) store.set(id, { ...l, ...patch })
    return Promise.resolve()
  },
})
