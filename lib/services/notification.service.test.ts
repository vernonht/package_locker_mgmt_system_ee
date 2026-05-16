import { createNotificationService } from './notification.service'
import { createInMemoryNotificationRepository } from '@/lib/repositories/in-memory/notification.repository'

test('send logs the message to the notification repo', async () => {
  const repo = createInMemoryNotificationRepository()
  const svc = createNotificationService(repo)

  await svc.send('+60123456789', 'L-001', 'A3F9C1')

  const logs = await repo.findAll()
  expect(logs).toHaveLength(1)
  expect(logs[0].recipientPhone).toBe('+60123456789')
  expect(logs[0].lockerNumber).toBe('L-001')
  expect(logs[0].message).toContain('A3F9C1')
})

test('send formats the SMS message correctly', async () => {
  const repo = createInMemoryNotificationRepository()
  const svc = createNotificationService(repo)

  await svc.send('+60123456789', 'L-001', 'A3F9C1')

  const log = (await repo.findAll())[0]
  expect(log.message).toMatch(/SMS.*\+60123456789.*L-001.*A3F9C1/)
})

test('multiple sends append to the log', async () => {
  const repo = createInMemoryNotificationRepository()
  const svc = createNotificationService(repo)

  await svc.send('+601', 'L-001', 'AAA111')
  await svc.send('+602', 'L-002', 'BBB222')

  expect(await repo.findAll()).toHaveLength(2)
})
