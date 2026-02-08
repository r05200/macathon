import Panel from "../components/Panel.tsx"

const PLACEHOLDER_ITEMS = [
  { name: "Company A", domains: 12 },
  { name: "Company B", domains: 8 },
  { name: "Company C", domains: 5 },
]

export default function Companies() {
  return (
    <div className="space-y-6">
      <Panel title="Company ownership">
        <ul className="divide-y divide-gray-100">
          {PLACEHOLDER_ITEMS.map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm font-medium text-gray-900">{item.name}</span>
              <span className="text-sm text-gray-500">{item.domains} domains</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
