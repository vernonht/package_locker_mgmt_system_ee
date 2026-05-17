export interface NotificationLog {
  id: string
  recipientPhone: string
  lockerNumber: string
  code: string
  provider: string
  sentAt: Date
  message: string
}
