import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AppShell from "./layout/AppShell";
import Overview from "./pages/Overview";
import Trackers from "./pages/Trackers";
import Companies from "./pages/Companies";
import Trends from "./pages/Trends";
import Geography from "./pages/Geography";
import Settings from "./pages/Settings";

import { useAuth0 } from "@auth0/auth0-react";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";

const authDisabled = import.meta.env.VITE_AUTH_DISABLED === 'true';

// (previously used HOC) AppShellProtected removed — using ProtectedRoute instead

// Landing page component that handles auth flow
function Landing() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  useEffect(() => {
    // Prevent redirect loops by checking if we're already authenticated
    if (!isLoading && isAuthenticated) {
      // Only redirect once we're sure about auth state
      console.log("User authenticated, redirecting to app");
    }
  }, [isLoading, isAuthenticated]);

  // Detect OAuth callback in URL (Auth0 returns ?code=...&state=...)
  const isCallback = !!(location.search.includes("code=") && location.search.includes("state="));

  useEffect(() => {
    // If auth is enabled and user is not authenticated, trigger login immediately
    if (!authDisabled && !isLoading && !isAuthenticated && !isCallback) {
      loginWithRedirect({ appState: { returnTo: location.pathname + location.search } });
    }
  }, [authDisabled, isLoading, isAuthenticated, isCallback, loginWithRedirect, location.pathname, location.search]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  // If authenticated, redirect to app
  if (isAuthenticated) {
    return <Navigate to="/app/overview" replace />;
  }

  // If not authenticated and auth is enabled, trigger login (see useEffect)

    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div className="p-6 bg-white rounded shadow text-center">
          <h2 className="text-lg font-semibold">Redirecting to sign in…</h2>
        </div>
      </div>
    );


  // If auth is disabled, just redirect
  return <Navigate to="/app/overview" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Protect everything under /app */}
      <Route
        path="/app"
        element={
          authDisabled ? (
            <AppShell />
          ) : (
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          )
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="trackers" element={<Trackers />} />
        <Route path="companies" element={<Companies />} />
        <Route path="trends" element={<Trends />} />
        <Route path="geography" element={<Geography />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}