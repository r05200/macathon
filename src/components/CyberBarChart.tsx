type BarItem = {
  label: string
  value: number
  sublabel?: string
}

type CyberBarChartProps = {
  items: BarItem[]
  maxValue?: number
  accentColor?: string
}

export default function CyberBarChart({ items, maxValue, accentColor = "var(--cyber-accent)" }: CyberBarChartProps) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1)

  if (items.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-[var(--cyber-text-muted)] text-sm">
        <span className="text-2xl mb-2 opacity-40">[ ]</span>
        No data yet
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item, i) => {
        const pct = Math.max(2, (item.value / max) * 100)
        return (
          <li
            key={item.label}
            className="animate-slide-up"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--cyber-text)] font-medium truncate mr-2">
                {item.label}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.sublabel && (
                  <span className="text-[var(--cyber-text-muted)] text-[10px]">{item.sublabel}</span>
                )}
                <span
                  className="font-bold tabular-nums"
                  style={{ color: accentColor }}
                >
                  {item.value.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--cyber-border)]">
              <div
                className="h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: accentColor,
                  opacity: 0.7,
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
