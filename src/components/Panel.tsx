type PanelProps = {
  title?: string
  children: React.ReactNode
  className?: string
}

export default function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
