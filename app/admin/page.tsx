import { AdminLockerSection } from '@/components/AdminLockerSection'
import { NotificationLog } from '@/components/NotificationLog'
import { OccupancySummary } from '@/components/OccupancySummary'

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">System overview — auto-refreshes every 5 seconds</p>
        </div>

        <OccupancySummary />

        <AdminLockerSection />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <NotificationLog />
        </div>
      </div>
    </main>
  )
}
