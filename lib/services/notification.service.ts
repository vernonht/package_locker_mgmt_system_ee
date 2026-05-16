import { randomUUID } from 'crypto'
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification.repository'

export type NotificationService = {
  send(phone: string, lockerNumber: string, code: string): Promise<void>
}

export const createNotificationService = (repo: NotificationRepository): NotificationService => ({
  send: async (phone: string, lockerNumber: string, code: string) => {
    const message = `SMS → ${phone}: Your package is in Locker ${lockerNumber}. Code: ${code}`
    console.log(message)
    await repo.save({ id: randomUUID(), recipientPhone: phone, lockerNumber, message, sentAt: new Date() })
  },
})
