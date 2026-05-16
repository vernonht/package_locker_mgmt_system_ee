'use client'

import { useState } from 'react'
import { lockerApi } from '@/lib/services/api/locker.api'
import { packageApi } from '@/lib/services/api/package.api'

type Step1Result = { lockerId: string; lockerNumber: string; lockerSize: string; holdExpiresAt: string }
type Step = 'reserve' | 'confirm' | 'done'

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }: {
  label: string; name: string; value: string
  onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  )
}

export function DepositForm() {
  const [step, setStep] = useState<Step>('reserve')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [depth, setDepth] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [hold, setHold] = useState<Step1Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReserve = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await lockerApi.hold(Number(width), Number(height), Number(depth))
      setHold(data)
      setStep('confirm')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await packageApi.deposit({
        lockerId: hold!.lockerId,
        lockerNumber: hold!.lockerNumber,
        recipientName: name,
        recipientPhone: phone,
        width: Number(width),
        height: Number(height),
        depth: Number(depth),
      })
      setStep('done')
    } catch (err: any) {
      const msg = err.message || 'Something went wrong'
      setError(msg)
      if (msg.includes('expired')) setStep('reserve')
    } finally {
      setLoading(false)
    }
  }

  const reset = async() => {
    await lockerApi.release(hold!.lockerId)
    setStep('reserve')
    setHold(null)
    setError('')
    setWidth('')
    setHeight('')
    setDepth('')
    setName('')
    setPhone('')
  }

  if (step === 'done') {
    return (
      <div className="text-center space-y-4 py-6">
        <p className="text-green-700 font-semibold">Package deposited successfully!</p>
        <p className="text-gray-600 text-sm">SMS sent to {phone}</p>
        <button onClick={reset} className="mt-4 text-blue-600 hover:underline text-sm">Deposit another package</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {step === 'reserve' && (
        <form onSubmit={handleReserve} className="space-y-4">
          <h2 className="font-semibold text-gray-800">Step 1 — Reserve a Locker</h2>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Width (cm)" name="width" value={width} onChange={setWidth} type="number" placeholder="25" />
            <Field label="Height (cm)" name="height" value={height} onChange={setHeight} type="number" placeholder="20" />
            <Field label="Depth (cm)" name="depth" value={depth} onChange={setDepth} type="number" placeholder="15" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Reserving…' : 'Reserve Locker'}
          </button>
        </form>
      )}

      {step === 'confirm' && hold && (
        <form onSubmit={handleDeposit} className="space-y-4">
          <h2 className="font-semibold text-gray-800">Step 2 — Confirm Deposit</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-800">
            Locker <strong>{hold.lockerSize}</strong> reserved. You have 10 minutes to load the package.
            <div className="text-xs mt-0.5 text-blue-600 font-mono">{hold.lockerNumber}</div>
          </div>
          <Field label="Recipient Name" name="name" value={name} onChange={setName} placeholder="Jane Doe" />
          <Field label="Recipient Phone" name="phone" value={phone} onChange={setPhone} placeholder="+60123456789" />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={reset} className="flex-1 border border-gray-300 py-2 rounded-md text-sm">
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Confirming…' : 'Confirm Deposit'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
