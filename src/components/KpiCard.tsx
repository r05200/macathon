type KpiCardProps = {
  label: string
  value: string | number
  delta?: string
  deltaPositive?: boolean
  delay?: number
}

export default function KpiCard({ label, value, delta, deltaPositive, delay = 0 }: KpiCardProps) {
  return (
    <div
      className="animate-slide-up rounded-lg border border-[var(--cyber-border)] bg-[var(--cyber-surface)] p-4 hover:border-[var(--cyber-accent)]/30 transition-colors duration-300"
      style={{ animationDelay: `${delay * 0.08}s` }}
    >
      <p className="text-xs font-medium text-[var(--cyber-text-muted)] uppercase tracking-widest">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-[var(--cyber-text)] tabular-nums">{value}</p>
        {delta !== undefined && (
          <span
            className={`text-sm font-medium ${
              deltaPositive ? "text-[var(--cyber-accent-green)]" : "text-[var(--cyber-danger)]"
            }`}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}
