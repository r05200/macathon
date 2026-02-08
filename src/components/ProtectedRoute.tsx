import { useEffect } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

type Props = { children: ReactNode };

const authDisabled = import.meta.env.VITE_AUTH_DISABLED === 'true';

export default function ProtectedRoute({ children }: Props) {
  if (authDisabled) {
    return <>{children}</>;
  }

  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  const isCallback = !!(location.search.includes("code=") && location.search.includes("state="));

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isCallback) {
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

  return null;
}
