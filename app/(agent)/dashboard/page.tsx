import { DepositForm } from '@/components/DepositForm'
import { LockerGrid } from '@/components/LockerGrid'

export default function AgentDashboard() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Deposit packages into available lockers</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <DepositForm />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <LockerGrid />
        </div>
      </div>
    </main>
  )
}
