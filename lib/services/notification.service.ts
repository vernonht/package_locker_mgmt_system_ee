import { randomUUID } from 'crypto'
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification.repository'

export type NotificationService = {
  send(phone: string, lockerId: string, code: string): void
}

export const createNotificationService = (repo: NotificationRepository): NotificationService => ({
  send: (phone, lockerId, code) => {
    const message = `SMS → ${phone}: Your package is in Locker ${lockerId}. Code: ${code}`
    console.log(message) // For testing purposes
    repo.save({ id: randomUUID(), recipientPhone: phone, lockerId, message, sentAt: new Date() })
  },
})
