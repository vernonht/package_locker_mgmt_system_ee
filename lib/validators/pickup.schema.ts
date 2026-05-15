import { z } from 'zod'

export const pickupSchema = z.object({
  pickupCode: z.string().length(6),
})

export type PickupInput = z.infer<typeof pickupSchema>
