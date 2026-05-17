'use client'

import { useState } from 'react'
import { lockerApi } from '@/lib/services/api/locker.api'
import type { LockerSize } from '@/lib/models/locker'
import { LOCKER_SIZE_PRESETS } from '@/constants/locker.constants'
import { COMMON_LABELS, ERROR_MESSAGES } from '@/constants/messages.constants'

type Props = { onCreated?: () => void }

export function CreateLockerForm({ onCreated }: Props) {
  const [open, setOpen]         = useState(false)
  const [size, setSize]         = useState<LockerSize>('SMALL')
  const [maxWidth, setMaxWidth]   = useState(LOCKER_SIZE_PRESETS.SMALL.maxWidth)
  const [maxHeight, setMaxHeight] = useState(LOCKER_SIZE_PRESETS.SMALL.maxHeight)
  const [maxDepth, setMaxDepth]   = useState(LOCKER_SIZE_PRESETS.SMALL.maxDepth)
  const [loading, setLoading]   = useState(false)
  const [errMsg, setErrMsg]     = useState('')
  const [success, setSuccess]   = useState('')

  const applyPreset = (s: LockerSize) => {
    setSize(s)
    const p = LOCKER_SIZE_PRESETS[s]
    setMaxWidth(p.maxWidth)
    setMaxHeight(p.maxHeight)
    setMaxDepth(p.maxDepth)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrMsg('')
    setSuccess('')
    try {
      const locker = await lockerApi.create({ size, maxWidth, maxHeight, maxDepth })
      setSuccess(`Locker ${locker.lockerNumber} (${size}) added successfully.`)
      applyPreset('SMALL')
      onCreated?.()
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : ERROR_MESSAGES.CREATE_LOCKER_FAILED)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Add Locker</h2>
        <button
          onClick={() => { setOpen(o => !o); setErrMsg(''); setSuccess('') }}
          className="text-xs text-blue-600 hover:underline"
        >
          {open ? COMMON_LABELS.CANCEL : '+ New Locker'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
              <select
                value={size}
                onChange={e => applyPreset(e.target.value as LockerSize)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="SMALL">SMALL</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LARGE">LARGE</option>
              </select>
              <span className="text-xs text-gray-400">{maxWidth}x{maxHeight}x{maxDepth} cm</span>
            </div>

            {/* remove customizing locker for now */}
            {/* <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Width (cm)</label>
              <input
                type="number"
                min={1}
                value={maxWidth}
                onChange={e => setMaxWidth(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Height (cm)</label>
              <input
                type="number"
                min={1}
                value={maxHeight}
                onChange={e => setMaxHeight(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Depth (cm)</label>
              <input
                type="number"
                min={1}
                value={maxDepth}
                onChange={e => setMaxDepth(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div> */}
          </div>

          {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}
          {success && <p className="text-green-700 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            {loading ? 'Adding…' : 'Add Locker'}
          </button>
        </form>
      )}
    </div>
  )
}
