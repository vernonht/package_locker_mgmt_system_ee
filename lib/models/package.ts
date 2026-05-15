export type PackageStatus = 'PENDING_DEPOSIT' | 'STORED' | 'RETRIEVED' | 'EXPIRED'

export interface Package {
  id: string
  recipientName: string
  recipientPhone: string
  width: number
  height: number
  depth: number
  pickupCodeHash: string
  status: PackageStatus
  lockerId: string | null
  createdAt: Date
  retrievedAt: Date | null
}
