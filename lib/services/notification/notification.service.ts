import { randomUUID } from 'node:crypto'
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification.repository'
import type { NotificationProvider } from './notification.provider'

export type NotificationService = {
  send(phone: string, lockerNumber: string, code: string, providerName?: string): Promise<void>
}

/**
 * Creates a notification service that composes multiple notification providers
 * @param repo - Repository for persisting notification history
 * @param providers - Array of notification providers (SMS, Email, WhatsApp, etc.)
 * @returns NotificationService instance
 */
export const createNotificationService = (
  repo: NotificationRepository,
  providers: NotificationProvider[] = [],
): NotificationService => ({
  send: async (phone: string, lockerNumber: string, code: string, providerName: string = 'SMS') => {
    const message = `Your package is in Locker ${lockerNumber}. Code: ${code}`

    // find the provider to send the notification
    const providerToUse = providers.find(p => p.name === providerName)
    
    if (providerToUse) {
      try {
        await providerToUse.send(phone, lockerNumber, code)
      } catch (error) {
        console.error(`Failed to send notification via ${providerToUse.name}:`, error)
      }
    } else {
      console.warn(`No valid provider found for ${providerName}, skipping notification send.`)
    }

    // Always persist notification history regardless of provider success
    await repo.save({
      id:             randomUUID(),
      recipientPhone: phone,
      lockerNumber,
      code,
      provider:       providerToUse ? providerToUse.name : 'none',
      message,
      sentAt:         new Date(),
    })
  },
})
