import { NavLink } from "react-router-dom"

type NavItemProps = {
  to: string
  label: string
}

export default function NavItem({ to, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-md text-sm font-medium tracking-wide transition-all duration-200 ${
          isActive
            ? "bg-[var(--cyber-accent)]/10 text-[var(--cyber-accent)] border-l-2 border-[var(--cyber-accent)]"
            : "text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text)] hover:bg-white/5"
        }`
      }
    >
      {label}
    </NavLink>
  )
}
