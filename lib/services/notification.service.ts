import { randomUUID } from 'crypto'
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification.repository'

export type NotificationService = {
  send(phone: string, lockerNumber: string, code: string): void
}

export const createNotificationService = (repo: NotificationRepository): NotificationService => ({
  send: (phone: string, lockerNumber: string, code: string) => {
    const message = `SMS → ${phone}: Your package is in Locker ${lockerNumber}. Code: ${code}`
    console.log(message) // For testing purposes
    repo.save({ id: randomUUID(), recipientPhone: phone, lockerNumber, message, sentAt: new Date() })
  },
})
