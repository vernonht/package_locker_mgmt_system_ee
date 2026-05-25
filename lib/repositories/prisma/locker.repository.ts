import type { PrismaClient } from '@/lib/generated/prisma/client'
import type { Locker } from '@/lib/models/locker'
import type { LockerRepository } from '@/lib/repositories/interfaces/locker.repository'

const toLocker = (r: Record<string, unknown>): Locker => ({
  id:               r.id as string,
  lockerNumber:     r.lockerNumber as string,
  size:             r.size as Locker['size'],
  maxWidth:         r.maxWidth as number,
  maxHeight:        r.maxHeight as number,
  maxDepth:         r.maxDepth as number,
  status:           r.status as Locker['status'],
  currentPackageId: (r.currentPackageId as string | null) ?? null,
  heldAt:           (r.heldAt as Date | null) ?? null,
})

export const createPrismaLockerRepository = (prisma: PrismaClient): LockerRepository => ({
  findAll: async (filters) => {
    const where = {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.size ? { size: filters.size } : {}),
    }
    const rows = await prisma.locker.findMany({ where })
    return rows.map(toLocker)
  },

  findById: async (id) => {
    const row = await prisma.locker.findUnique({ where: { id } })
    return row ? toLocker(row as Record<string, unknown>) : null
  },

  findAvailable: async () => {
    const rows = await prisma.locker.findMany({ where: { status: 'AVAILABLE' } })
    return rows.map(toLocker)
  },

  findHeld: async () => {
    const rows = await prisma.locker.findMany({ where: { status: 'HOLD' } })
    return rows.map(toLocker)
  },

  findFitting: async (w, h, d) => {
    const rows = await prisma.locker.findMany({
      where: {
        maxWidth:  { gte: w },
        maxHeight: { gte: h },
        maxDepth:  { gte: d },
      },
    })
    return rows.map(toLocker)
  },

  save: async (locker) => {
    await prisma.locker.create({
      data: {
        id:               locker.id,
        lockerNumber:     locker.lockerNumber,
        size:             locker.size,
        maxWidth:         locker.maxWidth,
        maxHeight:        locker.maxHeight,
        maxDepth:         locker.maxDepth,
        status:           locker.status,
        currentPackageId: locker.currentPackageId,
        heldAt:           locker.heldAt,
      },
    })
  },

  update: async (id, patch) => {
    await prisma.locker.update({ where: { id }, data: patch })
  },
})
