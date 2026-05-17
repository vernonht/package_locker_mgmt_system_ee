import { createInMemoryLockerRepository } from '@/lib/repositories/in-memory/locker.repository'
import { createInMemoryPackageRepository } from '@/lib/repositories/in-memory/package.repository'
import { createInMemoryNotificationRepository } from '@/lib/repositories/in-memory/notification.repository'
import { createInMemoryStorageChargeConfigRepository } from '@/lib/repositories/in-memory/storage-charge-config.repository'
import { createLockerService } from '@/lib/services/locker.service'
import { createPackageService } from '@/lib/services/package.service'
import { createNotificationService, emailProvider, smsProvider, whatsappProvider } from '@/lib/services/notification.service'
import { bestFitByVolume } from '@/lib/strategies/best-fit.strategy'
import { createLocker } from '@/lib/factories/locker.factory'

const lockerMap  = new Map()
const packageMap = new Map()

export const lockerRepo       = createInMemoryLockerRepository(lockerMap)
export const packageRepo      = createInMemoryPackageRepository(packageMap)
export const notificationRepo = createInMemoryNotificationRepository()

const SEED = [
  ...Array(5).fill({ size: 'SMALL',  maxWidth: 30, maxHeight: 30, maxDepth: 40  }),
  ...Array(5).fill({ size: 'MEDIUM', maxWidth: 50, maxHeight: 50, maxDepth: 60  }),
  ...Array(2).fill({ size: 'LARGE',  maxWidth: 80, maxHeight: 80, maxDepth: 100 }),
] as Parameters<typeof createLocker>[0][]

const seed = () => SEED.forEach((overrides, index) => {
  const lockerNumber = `L-${(index + 1).toString().padStart(3, '0')}`
  lockerRepo.save(createLocker({ ...overrides, lockerNumber }))
})

seed()

export const storageChargeConfigRepo = createInMemoryStorageChargeConfigRepository()

export const lockerService       = createLockerService(lockerRepo, bestFitByVolume)
export const notificationService = createNotificationService(notificationRepo, [smsProvider, emailProvider, whatsappProvider])
export const packageService      = createPackageService(lockerService, packageRepo, notificationService, storageChargeConfigRepo)

export const resetStore = () => {
  lockerMap.clear()
  packageMap.clear()
  seed()
}
