import { z } from 'zod'

export const createLockerSchema = z.object({
  size:      z.enum(['SMALL', 'MEDIUM', 'LARGE']),
  maxWidth:  z.number().positive(),
  maxHeight: z.number().positive(),
  maxDepth:  z.number().positive(),
})

export type CreateLockerInput = z.infer<typeof createLockerSchema>
