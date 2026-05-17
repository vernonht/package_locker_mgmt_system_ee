import type { NotificationProvider } from '../notification.provider'

/**
 * WhatsApp notification provider - sends via WhatsApp API
 */
export const whatsappProvider: NotificationProvider = {
  name: 'WhatsApp',
  async send(phone: string, lockerNumber: string, code: string) {
    const message = `Your package is in Locker ${lockerNumber}. Code: ${code}`
    console.log(`[WhatsApp → ${phone}]: ${message}`)
    // TODO: Integrate with WhatsApp Business API
  },
}
