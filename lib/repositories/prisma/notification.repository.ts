import type { PrismaClient } from '@/lib/generated/prisma/client'
import type { NotificationLog } from '@/lib/models/notification'
import type { NotificationRepository } from '@/lib/repositories/interfaces/notification.repository'

const isUnknownArgError = (err: unknown, field: 'code' | 'provider') =>
  err instanceof Error && err.message.includes(`Unknown argument \`${field}\``)

const toLog = (r: Record<string, unknown>): NotificationLog => ({
  id:             r.id as string,
  recipientPhone: r.recipientPhone as string,
  lockerNumber:   r.lockerNumber as string,
  code:           (r.code as string | undefined) ?? '',
  provider:       (r.provider as string | undefined) ?? 'none',
  message:        r.message as string,
  sentAt:         r.sentAt as Date,
})

export const createPrismaNotificationRepository = (prisma: PrismaClient): NotificationRepository => ({
  save: async (log) => {
    const data = {
      id:             log.id,
      recipientPhone: log.recipientPhone,
      lockerNumber:   log.lockerNumber,
      code:           log.code,
      provider:       log.provider,
      message:        log.message,
      sentAt:         log.sentAt,
    }

    try {
      await prisma.notificationLog.create({ data })
    } catch (err) {
      if (!isUnknownArgError(err, 'code') && !isUnknownArgError(err, 'provider')) throw err

      await (prisma.notificationLog as any).create({
        data: {
          id:             log.id,
          recipientPhone: log.recipientPhone,
          lockerNumber:   log.lockerNumber,
          message:        log.message,
          sentAt:         log.sentAt,
        },
      })
    }
  },

  findAll: async () => {
    const rows = await prisma.notificationLog.findMany({ orderBy: { sentAt: 'asc' } })
    return rows.map(toLog)
  },
})
