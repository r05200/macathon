import Panel from "../components/Panel.tsx"

export default function Trackers() {
  return (
    <div className="space-y-6">
      <Panel title="Trackers">
        <input
          type="search"
          placeholder="Search trackers..."
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Domain</th>
                <th className="pb-3 pr-4">Count</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400">
                  No data yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
