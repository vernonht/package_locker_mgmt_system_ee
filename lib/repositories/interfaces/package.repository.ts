import type { Package } from '@/lib/models/package'

export type PackageRepository = {
  findById(id: string): Package | null
  findByCodeHash(hash: string): Package | null
  save(pkg: Package): void
  update(id: string, patch: Partial<Package>): void
}
