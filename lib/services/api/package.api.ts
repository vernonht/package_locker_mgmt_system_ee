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

export const packageApi = {
  deposit: async (input: DepositInput): Promise<DepositResult> => {
    const res = await fetch('/api/packages/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (res.status === 409) throw new Error('Hold no longer valid. Please reserve a locker again.')
    if (res.status === 410) throw new Error('Hold expired (10 min limit). Please reserve a locker again.')
    if (!res.ok) throw new Error('Something went wrong. Please try again.')

    return res.json()
  },

  pickup: async (pickupCode: string): Promise<{ lockerId: string; lockerNumber: string }> => {
    const res = await fetch('/api/packages/pickup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupCode }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error?.message || 'Invalid or expired pickup code')
    }

    return res.json()
  },
}
