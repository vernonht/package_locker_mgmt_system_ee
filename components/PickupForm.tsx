'use client'

import { useState } from 'react'
import { packageApi } from '@/lib/services/api/package.api'

type State = 'idle' | 'loading' | 'success' | 'error'

export function PickupForm() {
  const [code, setCode]     = useState('')
  const [lockerNumber, setLockerNumber] = useState('')
  const [state, setState]   = useState<State>('idle')
  const [errMsg, setErrMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    setErrMsg('')
    try {
      const result = await packageApi.pickup(code.toUpperCase())
      setLockerNumber(result.lockerNumber)
      setState('success')
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : 'Invalid or expired pickup code.')
      setState('error')
    }
  }

  const reset = () => { setCode(''); setState('idle'); setErrMsg(''); setLockerNumber('') }

  if (state === 'success') {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Pick Up Your Package</h1>
        <p className="text-sm text-gray-500">Enter the 6-character code from your SMS notification</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6))}
          placeholder="A3F9C1"
          maxLength={6}
          className="w-48 text-center text-3xl font-mono tracking-widest border-2 border-gray-300 rounded-xl px-4 py-4 focus:outline-none focus:border-blue-500 uppercase"
        />

        {state === 'error' && (
          <p className="text-red-600 text-sm text-center">{errMsg}</p>
        )}

        <button
          type="submit"
          disabled={code.length !== 6 || state === 'loading'}
          className="w-48 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          {state === 'loading' ? 'Checking…' : 'Unlock Locker'}
        </button>
      </div>
    </form>
  )
}
