export type LockerSize = 'SMALL' | 'MEDIUM' | 'LARGE'
export type LockerStatus = 'AVAILABLE' | 'HOLD' | 'OCCUPIED' | 'OUT_OF_ORDER'

export interface Locker {
  id: string
  lockerNumber: string
  size: LockerSize
  maxWidth: number
  maxHeight: number
  maxDepth: number
  status: LockerStatus
  currentPackageId: string | null
  heldAt: Date | null
}
