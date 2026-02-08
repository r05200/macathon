import Panel from "../components/Panel.tsx"

const PLACEHOLDER_COUNTRIES = [
  { country: "United States", count: 4521 },
  { country: "Germany", count: 2103 },
  { country: "United Kingdom", count: 1842 },
]

export default function Geography() {
  return (
    <div className="space-y-6">
      <Panel title="Top countries">
        <ul className="space-y-4">
          {PLACEHOLDER_COUNTRIES.map((item) => (
            <li key={item.country}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{item.country}</span>
                <span className="text-gray-500">{item.count.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-100"
                  style={{ width: `${Math.min(100, (item.count / 5000) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
