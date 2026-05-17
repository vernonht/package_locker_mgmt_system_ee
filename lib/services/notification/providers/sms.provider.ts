import type { NotificationProvider } from '../notification.provider'

/**
 * SMS notification provider - sends via SMS gateway
 */
export const smsProvider: NotificationProvider = {
  name: 'SMS',
  async send(phone: string, lockerNumber: string, code: string) {
    const message = `Your package is in Locker ${lockerNumber}. Code: ${code}`
    console.log(`[SMS → ${phone}]: ${message}`)
    // TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
  },
}
