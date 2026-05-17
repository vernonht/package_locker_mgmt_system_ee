import { createNotificationService, type NotificationProvider } from './notification.service'
import { createInMemoryNotificationRepository } from '@/lib/repositories/in-memory/notification.repository'

const smsProviderMock: NotificationProvider = { name: 'SMS', send: jest.fn() }
const emailProviderMock: NotificationProvider = { name: 'Email', send: jest.fn() }
const whatsappProviderMock: NotificationProvider = { name: 'WhatsApp', send: jest.fn() }
const providerMocks = [smsProviderMock, emailProviderMock, whatsappProviderMock]

beforeEach(() => {
  jest.clearAllMocks()
})

test('send persists notification to repository without providers', async () => {
  const repo = createInMemoryNotificationRepository()
  const svc = createNotificationService(repo, providerMocks)

  await svc.send('+60123456789', 'L-001', 'A3F9C1')

  const logs = await repo.findAll()
  expect(logs).toHaveLength(1)
  expect(logs[0].recipientPhone).toBe('+60123456789')
  expect(logs[0].lockerNumber).toBe('L-001')
  expect(logs[0].code).toBe('A3F9C1')
  expect(logs[0].provider).toBe('SMS')
  expect(logs[0].message).toContain('A3F9C1')
})

test('send SMS via SMS provider', async () => {
  const repo = createInMemoryNotificationRepository()
  const svc = createNotificationService(repo, providerMocks)

  await svc.send('+60123456789', 'L-001', 'A3F9C1', 'SMS')

  expect(smsProviderMock.send).toHaveBeenCalledWith('+60123456789', 'L-001', 'A3F9C1')
  const logs = await repo.findAll()
  expect(logs[0].provider).toBe('SMS')
})

test('send email via email provider', async () => {
  const repo = createInMemoryNotificationRepository()
  const svc = createNotificationService(repo, providerMocks)

  await svc.send('+60123456789', 'L-001', 'A3F9C1', 'Email')

  expect(emailProviderMock.send).toHaveBeenCalledWith('+60123456789', 'L-001', 'A3F9C1')
  const logs = await repo.findAll()
  expect(logs[0].provider).toBe('Email')
})

test('send persists notification even if providers fail', async () => {
  const repo = createInMemoryNotificationRepository()
  const failingProvider: NotificationProvider = {
    name: 'FailingSMTP',
    send: jest.fn().mockRejectedValue(new Error('SMTP connection failed')),
  }
  const svc = createNotificationService(repo, [failingProvider])

  await svc.send('+60123456789', 'L-001', 'A3F9C1')

  const logs = await repo.findAll()
  expect(logs).toHaveLength(1)
})

test('multiple sends append to the log', async () => {
  const repo = createInMemoryNotificationRepository()
  const svc = createNotificationService(repo, providerMocks)

  await svc.send('+601', 'L-001', 'AAA111')
  await svc.send('+602', 'L-002', 'BBB222')

  expect(await repo.findAll()).toHaveLength(2)
})
