'use client'

import { useEffect, useState, useCallback } from 'react'
import type { NotificationLog as Log } from '@/lib/models/notification'

export function NotificationLog() {
  const [logs, setLogs] = useState<Log[]>([])

  const refresh = useCallback(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then((data: Log[]) => setLogs([...data].reverse()))
      .catch(console.error)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Notification Log</h2>
        <button onClick={refresh} className="text-xs text-blue-600 hover:underline">Refresh</button>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No notifications yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2 pr-4">Locker</th>
                <th className="pb-2 pr-4">Sent At</th>
                <th className="pb-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 font-mono text-xs">{log.recipientPhone}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{log.lockerNumber}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString()}
                  </td>
                  <td className="py-2 text-xs text-gray-600 max-w-xs truncate">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
