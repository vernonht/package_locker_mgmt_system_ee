import type { Locker } from '@/lib/models/locker'

export type HoldLockerResult = {
  lockerId: string
  lockerNumber: string
  lockerSize: string
  holdExpiresAt: string
}

export const lockerApi = {
  fetchAll: async (): Promise<Locker[]> => {
    const res = await fetch('/api/lockers')
    if (!res.ok) throw new Error('Failed to fetch lockers')
    return res.json()
  },

  hold: async (width: number, height: number, depth: number): Promise<HoldLockerResult> => {
    const res = await fetch('/api/lockers/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ width, height, depth }),
    })
    
    if (res.status === 409) throw new Error('No lockers available for this parcel size. Try again shortly.')
    if (res.status === 422) throw new Error('Parcel exceeds our largest locker (80×80×100 cm).')
    if (!res.ok) throw new Error('Validation error. Please check dimensions.')
    
    return res.json()
  },
}
