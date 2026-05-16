import { defaultStorageChargeConfig } from '@/lib/config/storage-charges'
import type { StorageChargeConfig } from '@/lib/config/storage-charges'
import type { StorageChargeConfigRepository } from '@/lib/repositories/interfaces/storage-charge-config.repository'

export const createInMemoryStorageChargeConfigRepository = (
  config: StorageChargeConfig = defaultStorageChargeConfig,
): StorageChargeConfigRepository => ({
  getActive: () => Promise.resolve(config),
})
