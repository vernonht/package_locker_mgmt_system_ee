import { prisma } from '@/lib/db/prisma'
import { createPrismaLockerRepository } from '@/lib/repositories/prisma/locker.repository'
import { createPrismaPackageRepository } from '@/lib/repositories/prisma/package.repository'
import { createPrismaNotificationRepository } from '@/lib/repositories/prisma/notification.repository'
import { createPrismaStorageChargeConfigRepository } from '@/lib/repositories/prisma/storage-charge-config.repository'
import { createLockerService } from '@/lib/services/locker.service'
import { createPackageService } from '@/lib/services/package.service'
import { createNotificationService, emailProvider, smsProvider, whatsappProvider } from '@/lib/services/notification.service'
import { bestFitByVolume } from '@/lib/strategies/best-fit.strategy'

export const lockerRepo             = createPrismaLockerRepository(prisma)
export const packageRepo            = createPrismaPackageRepository(prisma)
export const notificationRepo       = createPrismaNotificationRepository(prisma)
export const storageChargeConfigRepo = createPrismaStorageChargeConfigRepository(prisma)

export const lockerService       = createLockerService(lockerRepo, bestFitByVolume)
export const notificationService = createNotificationService(notificationRepo, [smsProvider, emailProvider, whatsappProvider])
export const packageService      = createPackageService(lockerService, packageRepo, notificationService, storageChargeConfigRepo)
