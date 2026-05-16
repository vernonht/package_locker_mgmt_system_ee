import { packageService } from '@/lib/db'
import { depositSchema } from '@/lib/validators/deposit.schema'
import { handleError } from '@/lib/errors/handler'
import { treeifyError } from 'zod'

export const POST = async (req: Request) => {
  const body = await req.json()
  const parsed = depositSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: treeifyError(parsed.error) }, { status: 400 })

  try {
    const result = await packageService.depositPackage(parsed.data)
    return Response.json(result)
  } catch (err) {
    return handleError(err)
  }
}
