import { z } from 'zod'

export const pickupSchema = z.object({
  pickupCode:   z.string().length(6),
  lockerNumber: z.string().min(1),
})

export type PickupInput = z.infer<typeof pickupSchema>
