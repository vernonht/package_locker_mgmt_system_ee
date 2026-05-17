'use client'

import { useState } from 'react'
import { LockerGrid } from './LockerGrid'
import { CreateLockerForm } from './CreateLockerForm'

export function AdminLockerSection() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <CreateLockerForm onCreated={() => setRefreshTrigger(t => t + 1)} />
      <hr className="border-gray-100" />
      <LockerGrid refreshTrigger={refreshTrigger} />
    </div>
  )
}
