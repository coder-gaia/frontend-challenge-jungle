import { z } from 'zod'

export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})
export type AuthSearch = z.infer<typeof authSearchSchema>
