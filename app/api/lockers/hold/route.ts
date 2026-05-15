import { lockerService } from '@/lib/db/store'
import { holdSchema } from '@/lib/validators/hold.schema'
import { handleError } from '@/lib/errors/handler'
import { treeifyError } from 'zod'

export const POST = async (req: Request) => {
  const body = await req.json()
  const parsed = holdSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: treeifyError(parsed.error) }, { status: 400 })

  try {
    lockerService.releaseExpiredHolds()
    const { width, height, depth } = parsed.data
    const locker = lockerService.holdBestFit(width, height, depth)
    const holdExpiresAt = new Date(locker.heldAt!.getTime() + 10 * 60 * 1000)
    return Response.json({ lockerId: locker.id, lockerSize: locker.size, holdExpiresAt })
  } catch (err) {
    return handleError(err)
  }
}
