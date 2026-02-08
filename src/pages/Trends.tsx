import { useState } from "react"
import Panel from "../components/Panel.tsx"

const TIME_RANGES = ["24h", "7d", "30d"] as const

export default function Trends() {
  const [range, setRange] = useState<(typeof TIME_RANGES)[number]>("7d")

  return (
    <div className="space-y-6">
      <Panel title="Time-based trends">
        <div className="flex gap-2 mb-4">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="h-64 flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-sm text-gray-400">
          Chart area placeholder
        </div>
      </Panel>
    </div>
  )
}
