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
      <Panel title="Account">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">User Information</p>
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name || "User"}
                    className="w-16 h-16 rounded-full mb-3"
                  />
                )}
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-sm font-medium text-gray-900">{user.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user.email || "N/A"}</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
            >
              Log Out
            </button>
            <p className="mt-2 text-xs text-gray-500">
              You will be redirected to the login page
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Data controls">
        <p className="text-sm text-gray-500">Data controls coming soon.</p>
      </Panel>
    </div>
  )
}
