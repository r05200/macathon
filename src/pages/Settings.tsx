import Panel from "../components/Panel.tsx"
import { useAuth0 } from "@auth0/auth0-react"

export default function Settings() {
  const { user, logout } = useAuth0();

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  };

  return (
    <div className="space-y-6">
      <Panel title="Data controls" delay={1}>
        <p className="text-sm text-[var(--cyber-text-muted)]">Data controls coming soon.</p>
      </Panel>
    </div>
  )
}
