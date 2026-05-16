import { notificationRepo } from '@/lib/db/store'

export const GET = () => Response.json(notificationRepo.findAll())
