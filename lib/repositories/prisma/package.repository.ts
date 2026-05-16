import type { PrismaClient } from '@/lib/generated/prisma/client'
import type { Package } from '@/lib/models/package'
import type { PackageRepository } from '@/lib/repositories/interfaces/package.repository'

const toPackage = (r: Record<string, unknown>): Package => ({
  id:              r.id as string,
  recipientName:   r.recipientName as string,
  recipientPhone:  r.recipientPhone as string,
  width:           r.width as number,
  height:          r.height as number,
  depth:           r.depth as number,
  pickupCodeHash:  r.pickupCodeHash as string,
  status:          r.status as Package['status'],
  lockerId:        (r.lockerId as string | null) ?? null,
  lockerNumber:    (r.lockerNumber as string | null) ?? null,
  createdAt:       r.createdAt as Date,
  retrievedAt:     (r.retrievedAt as Date | null) ?? null,
})

export const createPrismaPackageRepository = (prisma: PrismaClient): PackageRepository => ({
  findById: async (id) => {
    const row = await prisma.package.findUnique({ where: { id } })
    return row ? toPackage(row as Record<string, unknown>) : null
  },

  findByCodeHash: async (hash) => {
    const row = await prisma.package.findUnique({ where: { pickupCodeHash: hash } })
    return row ? toPackage(row as Record<string, unknown>) : null
  },

  save: async (pkg) => {
    await prisma.package.create({
      data: {
        id:             pkg.id,
        recipientName:  pkg.recipientName,
        recipientPhone: pkg.recipientPhone,
        width:          pkg.width,
        height:         pkg.height,
        depth:          pkg.depth,
        pickupCodeHash: pkg.pickupCodeHash,
        status:         pkg.status,
        lockerId:       pkg.lockerId,
        lockerNumber:   pkg.lockerNumber,
        createdAt:      pkg.createdAt,
        retrievedAt:    pkg.retrievedAt,
      },
    })
  },

  update: async (id, patch) => {
    await prisma.package.update({ where: { id }, data: patch })
  },
})
