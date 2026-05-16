import { lockerService } from '@/lib/db'
import { LockerNotHeldError } from '@/lib/errors'
import { handleError } from '@/lib/errors/handler'

export const DELETE = async (_req: Request, { params }: { params: Promise<{ lockerId: string }> }) => {
  try {
    const { lockerId } = await params
    const lockers = await lockerService.getAllLockers()
    const locker = lockers.find((item) => item.id === lockerId)

    if (!locker) {
      return Response.json({ error: 'Locker not found', code: 'LOCKER_NOT_FOUND' }, { status: 404 })
    }

    if (locker.status !== 'HOLD') {
      throw new LockerNotHeldError()
    }

    await lockerService.setLockerAvailable(lockerId)
    return new Response(null, { status: 204 })
  } catch (err) {
    return handleError(err)
  }
}
