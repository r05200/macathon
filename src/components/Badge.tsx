type BadgeProps = {
  children: React.ReactNode
  className?: string
}

export default function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border border-[var(--cyber-accent)]/30 bg-[var(--cyber-accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--cyber-accent)] tracking-wide ${className}`}
    >
      {children}
    </span>
  )
}
