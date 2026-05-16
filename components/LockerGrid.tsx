'use client'

import { useEffect, useState, useCallback } from 'react'
import { lockerApi } from '@/lib/services/api/locker.api'
import type { Locker } from '@/lib/models/locker'

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-green-100  border-green-400  text-green-800',
  HOLD: 'bg-blue-100   border-blue-400   text-blue-800',
  OCCUPIED: 'bg-amber-100  border-amber-400  text-amber-800',
  OUT_OF_ORDER: 'bg-red-100    border-red-400    text-red-800',
}

function HoldTimer({ heldAt }: { heldAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const tick = () => {
      const ms = 10 * 60 * 1000 - (Date.now() - new Date(heldAt).getTime())
      if (ms <= 0) { setRemaining('expired'); return }
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [heldAt])

  return <span className="text-xs font-mono">{remaining}</span>
}

export function LockerGrid() {
  const [lockers, setLockers] = useState<Locker[]>([])

  const refresh = useCallback(async () => {
    try {
      const data = await lockerApi.fetchAll()
      setLockers(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Locker Status</h2>
        <button onClick={refresh} className="text-xs text-blue-600 hover:underline">Refresh</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {lockers.map(l => (
          <div
            key={l.id}
            className={`border rounded-lg p-3 text-sm ${STATUS_STYLES[l.status] ?? 'bg-gray-100'}`}
          >
            <div className="text-xs font-mono opacity-75 mb-1">{l.lockerNumber}</div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{l.size}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/60">{l.status}</span>
            </div>
            <div className="text-xs opacity-75 mb-1">{l.maxWidth}×{l.maxHeight}×{l.maxDepth} cm</div>
            {l.status === 'HOLD' && l.heldAt && (
              <div className="mt-1 text-xs">Expires in <HoldTimer heldAt={l.heldAt as unknown as string} /></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
