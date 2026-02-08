type PanelProps = {
  title?: string
  children: React.ReactNode
  className?: string
  delay?: number
}

export default function Panel({ title, children, className = "", delay = 0 }: PanelProps) {
  return (
    <div
      className={`animate-slide-up rounded-lg border border-[var(--cyber-border)] bg-[var(--cyber-surface)] shadow-lg shadow-black/20 ${className}`}
      style={{ animationDelay: `${delay * 0.08}s` }}
    >
      {title && (
        <div className="px-4 py-3 border-b border-[var(--cyber-border)]">
          <h3 className="text-sm font-medium text-[var(--cyber-accent)] tracking-wide uppercase">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
