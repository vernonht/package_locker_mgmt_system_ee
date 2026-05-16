import type { NotificationLog } from '@/lib/models/notification'

export const notificationApi = {
  fetchAll: async (): Promise<NotificationLog[]> => {
    const res = await fetch('/api/notifications')
    if (!res.ok) throw new Error('Failed to fetch notifications')
    return res.json()
  },
}
