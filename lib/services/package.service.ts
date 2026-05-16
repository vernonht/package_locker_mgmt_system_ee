import { createPackage } from '@/lib/factories/package.factory'
import { generateCode, hashCode } from './code.service'
import { InvalidCodeError } from '@/lib/errors'
import type { LockerService } from './locker.service'
import type { NotificationService } from './notification.service'
import type { PackageRepository } from '@/lib/repositories/interfaces/package.repository'

export type DepositInput = {
  lockerId:       string
  lockerNumber:   string
  recipientName:  string
  recipientPhone: string
  width:          number
  height:         number
  depth:          number
}

export type DepositResult = { pickupCode: string }
export type PickupResult = { lockerId: string; lockerNumber: string }

export const createPackageService = (
  lockerService:       LockerService,
  packageRepo:         PackageRepository,
  notificationService: NotificationService,
) => ({
  depositPackage: (input: DepositInput): DepositResult => {
    const { lockerId, lockerNumber, recipientName, recipientPhone, width, height, depth } = input

    const pickupCode = generateCode()
    const pkg = createPackage({
      recipientName,
      recipientPhone,
      width,
      height,
      depth,
      pickupCodeHash: hashCode(pickupCode),
      status:         'STORED',
      lockerId,
      lockerNumber,
    })

    lockerService.confirmOccupied(lockerId, pkg.id)
    packageRepo.save(pkg)
    notificationService.send(recipientPhone, lockerNumber, pickupCode)

    return { pickupCode }
  },

  pickupPackage: (inputCode: string): PickupResult => {
    const pkg = packageRepo.findByCodeHash(hashCode(inputCode))
    if (!pkg || pkg.status !== 'STORED') throw new InvalidCodeError()

    const locker = lockerService.getAllLockers().find(l => l.id === pkg.lockerId)

    packageRepo.update(pkg.id, { status: 'RETRIEVED', retrievedAt: new Date() })
    lockerService.setLockerAvailable(pkg.lockerId!)

    return { lockerId: pkg.lockerId!, lockerNumber: locker?.lockerNumber ?? pkg.lockerId! }
  },
})

export type PackageService = ReturnType<typeof createPackageService>
