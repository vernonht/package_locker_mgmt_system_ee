import { createPackage } from '@/lib/factories/package.factory'
import { generateCode, hashCode } from './code.service'
import { calculateStorageCharge } from './storage-charge.service'
import type { StorageChargeResult } from './storage-charge.service'
import { defaultStorageChargeConfig } from '@/lib/config/storage-charges'
import { InvalidCodeError } from '@/lib/errors'
import type { LockerService } from './locker.service'
import type { NotificationService } from './notification.service'
import type { PackageRepository } from '@/lib/repositories/interfaces/package.repository'
import type { StorageChargeConfigRepository } from '@/lib/repositories/interfaces/storage-charge-config.repository'

export type DepositInput = {
  lockerId:       string
  lockerNumber:   string
  recipientName:  string
  recipientPhone: string
  width:          number
  height:         number
  depth:          number
}

export type DepositResult  = { lockerId: string; lockerNumber: string }
export type PickupResult   = { lockerId: string; lockerNumber: string }
export type PickupPreview  = StorageChargeResult & { lockerNumber: string }

export const createPackageService = (
  lockerService:           LockerService,
  packageRepo:             PackageRepository,
  notificationService:     NotificationService,
  storageChargeConfigRepo: StorageChargeConfigRepository,
) => ({
  depositPackage: async (input: DepositInput): Promise<DepositResult> => {
    const { lockerId, lockerNumber, recipientName, recipientPhone, width, height, depth } = input

    const pickupCode = generateCode()
    const pkg = createPackage({
      recipientName, recipientPhone,
      width, height, depth,
      pickupCodeHash: hashCode(pickupCode),
      status:         'STORED',
      lockerId,
      lockerNumber,
    })

    await lockerService.confirmOccupied(lockerId, pkg.id)
    await packageRepo.save(pkg)
    await notificationService.send(recipientPhone, lockerNumber, pickupCode)

    return { lockerId, lockerNumber }
  },

  previewPickup: async (inputCode: string, now?: Date): Promise<PickupPreview> => {
    const pkg = await packageRepo.findByCodeHash(hashCode(inputCode))
    if (!pkg || pkg.status !== 'STORED') throw new InvalidCodeError()
    const config = await storageChargeConfigRepo.getActive() ?? defaultStorageChargeConfig
    const charge = calculateStorageCharge(pkg.createdAt, now, config)
    return { ...charge, lockerNumber: pkg.lockerNumber ?? '' }
  },

  pickupPackage: async (inputCode: string): Promise<PickupResult> => {
    const pkg = await packageRepo.findByCodeHash(hashCode(inputCode))
    if (!pkg || pkg.status !== 'STORED') throw new InvalidCodeError()

    const lockers = await lockerService.getAllLockers()
    const locker  = lockers.find(l => l.id === pkg.lockerId)

    await packageRepo.update(pkg.id, { status: 'RETRIEVED', retrievedAt: new Date() })
    await lockerService.setLockerAvailable(pkg.lockerId!)

    return { lockerId: pkg.lockerId!, lockerNumber: locker?.lockerNumber ?? pkg.lockerId! }
  },
})

export type PackageService = ReturnType<typeof createPackageService>
