type KpiCardProps = {
  label: string
  value: string | number
  delta?: string
  deltaPositive?: boolean
}

export default function KpiCard({ label, value, delta, deltaPositive }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {delta !== undefined && (
          <span
            className={`text-sm font-medium ${
              deltaPositive ? "text-emerald-600" : "text-gray-500"
            }`}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}
