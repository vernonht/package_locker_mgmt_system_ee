import { notificationRepo } from '@/lib/db'

export const GET = async () => Response.json(await notificationRepo.findAll())
