import { lockerService } from '@/lib/db'
import { createLockerSchema } from '@/lib/validators/locker.schema'
import { handleError } from '@/lib/errors/handler'
import { treeifyError } from 'zod'
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

export const POST = async (req: Request) => {
  const body = await req.json()
  const parsed = createLockerSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: treeifyError(parsed.error) }, { status: 400 })

  try {
    const locker = await lockerService.addLocker(parsed.data)
    return Response.json(locker, { status: 201 })
  } catch (err) {
    return handleError(err)
  }
}
