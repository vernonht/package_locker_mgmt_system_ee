import { PickupForm } from '@/components/PickupForm'

export default function KioskPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <PickupForm />
      </div>
    </main>
  )
}
