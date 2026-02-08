import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

type Props = { children: ReactNode };

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  // Detect OAuth callback in URL (Auth0 returns ?code=...&state=...)
  const isCallback = !!(location.search.includes("code=") && location.search.includes("state="));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isCallback) {
      // Trigger interactive login once when we know user is not authenticated
      loginWithRedirect({ appState: { returnTo: location.pathname + location.search } });
    }
  }, [isLoading, isAuthenticated, isCallback, loginWithRedirect, location.pathname, location.search]);

  if (isLoading || isCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading session…
      </div>
    );
  }

  if (isAuthenticated) return <>{children}</>;

  // While loginWithRedirect is starting, render nothing (useEffect will redirect)
  return null;
}
