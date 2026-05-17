export type DepositInput = {
  lockerId: string
  lockerNumber: string
  recipientName: string
  recipientPhone: string
  width: number
  height: number
  depth: number
}

export type DepositResult = {
  pickupCode: string
}

export type TierBreakdown = {
  days: number
  multiplier: number
  ratePerDay: number
  subtotal: number
}

export type PickupPreview = {
  days: number
  totalCharge: number
  breakdown: TierBreakdown[]
  lockerNumber: string
}

export const packageApi = {
  deposit: async (input: DepositInput): Promise<DepositResult> => {
    const res = await fetch('/api/packages/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (res.status === 409) throw new Error('Hold no longer valid. Please reserve a locker again.')
    if (res.status === 410) throw new Error('Hold expired (10 min limit). Please reserve a locker again.')
    if (res.status === 400) {
      const data = await res.json()
      const errors = data.error.properties || {}
      if (errors.recipientName) {
        throw new Error('Invalid recipient name. Please check your entries and try again.')
      }
      if (errors.recipientPhone) {
        throw new Error('Invalid recipient phone. Please check your entries and try again.')
      }
      throw new Error(data.message || 'Invalid input. Please check your entries and try again.')
    }
    if (!res.ok) throw new Error('Something went wrong. Please try again.')

    return res.json()
  },

  previewPickup: async (pickupCode: string, lockerNumber: string): Promise<PickupPreview> => {
    const res = await fetch('/api/packages/pickup/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupCode, lockerNumber }),
    })

    if (res.status === 404) throw new Error('Invalid locker number or pickup code. Please check your notification.')
    if (!res.ok) throw new Error('Something went wrong. Please try again.')

    return res.json()
  },

  pickup: async (pickupCode: string, lockerNumber: string): Promise<{ lockerId: string; lockerNumber: string }> => {
    const res = await fetch('/api/packages/pickup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupCode, lockerNumber }),
    })

    if (res.status === 404) throw new Error('Invalid locker number or pickup code. Please check your notification.')
    if (!res.ok) throw new Error('Something went wrong. Please try again.')

    return res.json()
  },
}
