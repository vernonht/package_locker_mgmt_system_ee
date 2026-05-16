import type { NotificationLog } from '@/lib/models/notification'

export type NotificationRepository = {
  save(log: NotificationLog): Promise<void>
  findAll(): Promise<NotificationLog[]>
}
