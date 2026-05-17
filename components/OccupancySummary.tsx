'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Locker } from '@/lib/models/locker'
import { lockerApi } from '@/lib/services/api/locker.api'
import { POLLING_INTERVAL_MS } from '@/constants/app.constants'

export function OccupancySummary() {
  const [lockers, setLockers] = useState<Locker[]>([])

  const refresh = useCallback(async () => {
    try {
      const data = await lockerApi.fetchAll()
      setLockers(data)
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLLING_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const occupied = lockers.filter(l => l.status === 'OCCUPIED').length
  const held     = lockers.filter(l => l.status === 'HOLD').length
  const available = lockers.filter(l => l.status === 'AVAILABLE').length

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
        <div className="text-3xl font-bold text-amber-600">{occupied}</div>
        <div className="text-xs text-gray-500 mt-1">Occupied</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
        <div className="text-3xl font-bold text-blue-600">{held}</div>
        <div className="text-xs text-gray-500 mt-1">On Hold</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
        <div className="text-3xl font-bold text-green-600">{available}</div>
        <div className="text-xs text-gray-500 mt-1">Available</div>
      </div>
    </div>
  )
}
