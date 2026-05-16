import { packageService } from '@/lib/db'
import { pickupSchema } from '@/lib/validators/pickup.schema'
import { handleError } from '@/lib/errors/handler'
import { treeifyError } from 'zod'

export const POST = async (req: Request) => {
  const body = await req.json()
  const parsed = pickupSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: treeifyError(parsed.error) }, { status: 400 })

  try {
    const result = await packageService.pickupPackage(parsed.data.pickupCode)
    return Response.json({ ...result, message: 'Package retrieved successfully' })
  } catch (err) {
    return handleError(err)
  }
}
