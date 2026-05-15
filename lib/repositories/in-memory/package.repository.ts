import type { Package } from '@/lib/models/package'
import type { PackageRepository } from '@/lib/repositories/interfaces/package.repository'

export const createInMemoryPackageRepository = (
  store = new Map<string, Package>(),
): PackageRepository => ({
  findById:        (id) => store.get(id) ?? null,
  findByCodeHash:  (hash) => [...store.values()].find(p => p.pickupCodeHash === hash) ?? null,
  save:            (pkg) => { store.set(pkg.id, pkg) },
  update:          (id, patch) => {
    const p = store.get(id)
    if (p) store.set(id, { ...p, ...patch })
  },
})
