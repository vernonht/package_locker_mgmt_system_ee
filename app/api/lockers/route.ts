import { lockerService } from '@/lib/db'
import type { LockerStatus, LockerSize } from '@/lib/models/locker'

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as LockerStatus | null
  const size   = searchParams.get('size')   as LockerSize   | null

  let lockers = await lockerService.getAllLockers()
  if (status) lockers = lockers.filter(l => l.status === status)
  if (size)   lockers = lockers.filter(l => l.size === size)

  return Response.json(lockers)
}
