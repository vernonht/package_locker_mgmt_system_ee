import type { Package } from '@/lib/models/package'

export type PackageRepository = {
  findById(id: string): Promise<Package | null>
  findByCodeHash(hash: string): Promise<Package | null>
  save(pkg: Package): Promise<void>
  update(id: string, patch: Partial<Package>): Promise<void>
}
