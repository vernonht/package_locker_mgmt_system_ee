import { createInMemoryLockerRepository } from '@/lib/repositories/in-memory/locker.repository'
import { createInMemoryPackageRepository } from '@/lib/repositories/in-memory/package.repository'
import { createInMemoryNotificationRepository } from '@/lib/repositories/in-memory/notification.repository'
import { createLocker } from '@/lib/factories/locker.factory'

const lockerMap       = new Map()
const packageMap      = new Map()

export const lockerRepo       = createInMemoryLockerRepository(lockerMap)
export const packageRepo      = createInMemoryPackageRepository(packageMap)
export const notificationRepo = createInMemoryNotificationRepository()

const SEED = [
  ...Array(3).fill({ size: 'SMALL',  maxWidth: 30, maxHeight: 30, maxDepth: 40  }),
  ...Array(3).fill({ size: 'MEDIUM', maxWidth: 50, maxHeight: 50, maxDepth: 60  }),
  ...Array(2).fill({ size: 'LARGE',  maxWidth: 80, maxHeight: 80, maxDepth: 100 }),
] as Parameters<typeof createLocker>[0][]

const seed = () => SEED.forEach(overrides => lockerRepo.save(createLocker(overrides)))

seed()

export const resetStore = () => {
  lockerMap.clear()
  packageMap.clear()
  seed()
}
