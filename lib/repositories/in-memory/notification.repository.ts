import type { NotificationLog } from '@/lib/models/notification'
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification.repository'

export const createInMemoryNotificationRepository = (): NotificationRepository => {
  const store: NotificationLog[] = []
  return {
    save:    (log) => { store.push(log); return Promise.resolve() },
    findAll: () => Promise.resolve([...store]),
  }
}
