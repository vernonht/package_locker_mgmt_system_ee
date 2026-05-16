import type { PrismaClient } from '@/lib/generated/prisma/client'
import type { NotificationLog } from '@/lib/models/notification'
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification.repository'

const toLog = (r: Record<string, unknown>): NotificationLog => ({
  id:             r.id as string,
  recipientPhone: r.recipientPhone as string,
  lockerNumber:   r.lockerNumber as string,
  message:        r.message as string,
  sentAt:         r.sentAt as Date,
})

export const createPrismaNotificationRepository = (prisma: PrismaClient): NotificationRepository => ({
  save: async (log) => {
    await prisma.notificationLog.create({
      data: {
        id:             log.id,
        recipientPhone: log.recipientPhone,
        lockerNumber:   log.lockerNumber,
        message:        log.message,
        sentAt:         log.sentAt,
      },
    })
  },

  findAll: async () => {
    const rows = await prisma.notificationLog.findMany({ orderBy: { sentAt: 'asc' } })
    return rows.map(toLog)
  },
})
