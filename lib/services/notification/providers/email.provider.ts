import type { NotificationProvider } from '../notification.provider'

/**
 * Email notification provider - sends via email service
 */
export const emailProvider: NotificationProvider = {
  name: 'Email',
  async send(email: string, lockerNumber: string, code: string) {
    const message = `Your package is in Locker ${lockerNumber}. Code: ${code}`
    console.log(`[Email → ${email}]: ${message}`)
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  },
}
