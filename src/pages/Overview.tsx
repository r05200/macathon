import Panel from "../components/Panel.tsx"
import KpiCard from "../components/KpiCard.tsx"

export default function Overview() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total events" value="12,847" delta="+12%" deltaPositive />
        <KpiCard label="Unique sites" value="423" delta="+8%" deltaPositive />
        <KpiCard label="Countries" value="24" />
        <KpiCard label="Trackers" value="156" delta="-3%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Trends (7d)">
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            Chart placeholder
          </div>
        </Panel>
        <Panel title="Categories">
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">
            Category breakdown placeholder
          </div>
        </Panel>
      </div>
    </div>
  )
}
