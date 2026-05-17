// Barrel export for backward compatibility
export { createNotificationService, type NotificationService } from '@/lib/services/notification/notification.service'
export type { NotificationProvider } from '@/lib/services/notification/notification.provider'

// Export providers for convenience
export { smsProvider } from '@/lib/services/notification/providers/sms.provider'
export { emailProvider } from '@/lib/services/notification/providers/email.provider'
export { whatsappProvider } from '@/lib/services/notification/providers/whatsapp.provider'
