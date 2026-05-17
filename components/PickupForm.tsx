'use client'

import { useState } from 'react'
import { packageApi, type PickupPreview } from '@/lib/services/api/package.api'
import { COMMON_LABELS, ERROR_MESSAGES, PICKUP_STEPS } from '@/constants/messages.constants'

type Step = (typeof PICKUP_STEPS)[keyof typeof PICKUP_STEPS]

export function PickupForm() {
  const [step, setStep] = useState<Step>(PICKUP_STEPS.ENTER_CODE)
  const [code, setCode] = useState('')
  const [lockerInput, setLockerInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [preview, setPreview] = useState<PickupPreview | null>(null)
  const [lockerNumber, setLockerNumber] = useState('')

  const reset = () => {
    setCode('')
    setLockerInput('')
    setStep(PICKUP_STEPS.ENTER_CODE)
    setErrMsg('')
    setPreview(null)
    setLockerNumber('')
  }

  const handleCodeSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrMsg('')
    try {
      const result = await packageApi.previewPickup(code.toUpperCase(), lockerInput.toUpperCase())
      if (result.totalCharge > 0) {
        setPreview(result)
        setStep(PICKUP_STEPS.CHARGE_SCREEN)
      } else {
        const pickupResult = await packageApi.pickup(code.toUpperCase(), lockerInput.toUpperCase())
        setLockerNumber(pickupResult.lockerNumber)
        setStep(PICKUP_STEPS.LOCKER_OPEN)
      }
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : ERROR_MESSAGES.INVALID_LOCKER_OR_PICKUP_CODE)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    setLoading(true)
    setErrMsg('')
    try {
      const result = await packageApi.pickup(code.toUpperCase(), lockerInput.toUpperCase())
      setLockerNumber(result.lockerNumber)
      setStep(PICKUP_STEPS.LOCKER_OPEN)
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG_RETRY)
    } finally {
      setLoading(false)
    }
  }

  const onCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6))
  }

  const onLockerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLockerInput(e.target.value.toUpperCase())
  }

  if (step === PICKUP_STEPS.LOCKER_OPEN) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-5xl">✓</div>
        <p className="text-xl font-semibold text-green-700">Locker is now open</p>
        <p className="text-gray-600">Please collect your package from Locker:</p>
        <div className="inline-block bg-gray-100 text-gray-900 text-lg font-mono px-6 py-3 rounded-lg border">
          {lockerNumber}
        </div>
        <div>
          <button onClick={reset} className="mt-4 text-blue-600 hover:underline text-sm">
            Enter another code
          </button>
        </div>
      </div>
    )
  }

  if (step === PICKUP_STEPS.CHARGE_SCREEN && preview) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Storage Fee Due</h1>
          <p className="text-sm text-gray-500">
            Your package has been stored for {preview.days} day{preview.days !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Period</th>
                <th className="px-4 py-2 text-right">Rate/day</th>
                <th className="px-4 py-2 text-right">Days</th>
                <th className="px-4 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.breakdown.map((tier, i) => (
                <tr key={i} className="bg-white">
                  <td className="px-4 py-2 text-gray-700">{tier.multiplier}× rate</td>
                  <td className="px-4 py-2 text-right text-gray-700">${tier.ratePerDay.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{tier.days}</td>
                  <td className="px-4 py-2 text-right text-gray-900 font-medium">${tier.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">
                  ${preview.totalCharge.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {errMsg && <p className="text-red-600 text-sm text-center">{errMsg}</p>}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleConfirmPayment}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            {loading ? 'Processing…' : `Pay $${preview.totalCharge.toFixed(2)} & Open Locker`}
          </button>
          <button
            onClick={reset}
            disabled={loading}
            className="w-full text-gray-500 hover:text-gray-700 text-sm"
          >
            {COMMON_LABELS.CANCEL}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleCodeSubmit} className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Pick Up Your Package</h1>
        <p className="text-sm text-gray-500">Enter the locker number and the 6-character code from your SMS</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-xs space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 text-center">Locker Number</label>
            <input
              type="text"
              value={lockerInput}
              onChange={e => onLockerInputChange(e)}
              placeholder="L-001"
              className="w-full text-center text-xl font-mono tracking-widest border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 text-center">Pickup Code</label>
            <input
              type="text"
              value={code}
              onChange={e => onCodeInputChange(e)}
              placeholder="A3F9C1"
              maxLength={6}
              className="w-full text-center text-3xl font-mono tracking-widest border-2 border-gray-300 rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 uppercase"
            />
          </div>
        </div>

        {errMsg && (
          <p className="text-red-600 text-sm text-center">{errMsg}</p>
        )}

        <button
          type="submit"
          disabled={code.length !== 6 || lockerInput.trim().length === 0 || loading}
          className="w-48 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          {loading ? 'Checking…' : 'Unlock Locker'}
        </button>
      </div>
    </form>
  )
}
