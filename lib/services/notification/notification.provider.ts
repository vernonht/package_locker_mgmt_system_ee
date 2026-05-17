/**
 * NotificationProvider interface for pluggable notification channels
 * Implement this to add new notification methods (Email, WhatsApp, Slack, etc.)
 */
export interface NotificationProvider {
  name: string
  send(recipient: string, lockerNumber: string, code: string): Promise<void>
}
