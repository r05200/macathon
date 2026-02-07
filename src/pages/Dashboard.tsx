import StatCard from "../components/StatCard"
import { mockEvents } from "../data/mockEvents"

export default function Dashboard() {
  return (
    <div className="min-h-full bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <h1 className="text-2xl font-semibold">
          Tracker Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total events" value={mockEvents.length} />
          <StatCard label="Unique sites" value={new Set(mockEvents.map(e => e.firstParty)).size} />
          <StatCard label="Countries" value={new Set(mockEvents.map(e => e.country)).size} />
        </div>

        <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
          This is mock data. Backend + extension will plug in here later.
        </div>

      </div>
    </div>
  )
}
