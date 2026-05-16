import { z } from 'zod'

export const depositSchema = z.object({
  lockerId:       z.uuid(),
  lockerNumber:   z.string().min(1),
  recipientName:  z.string().min(1),
  recipientPhone: z.string().min(7),
  width:          z.number().positive(),
  height:         z.number().positive(),
  depth:          z.number().positive(),
})

export type DepositInput = z.infer<typeof depositSchema>
