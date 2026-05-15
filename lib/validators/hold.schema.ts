import { z } from 'zod'

export const holdSchema = z.object({
  width:  z.number().positive(),
  height: z.number().positive(),
  depth:  z.number().positive(),
})

export type HoldInput = z.infer<typeof holdSchema>
