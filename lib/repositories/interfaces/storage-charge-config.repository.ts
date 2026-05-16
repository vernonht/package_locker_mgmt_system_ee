import type { StorageChargeConfig } from '@/lib/config/storage-charges'

export type StorageChargeConfigRepository = {
  getActive(): Promise<StorageChargeConfig | null>
}
