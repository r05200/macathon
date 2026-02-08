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
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const location = useLocation();

  // Detect OAuth callback in URL (Auth0 returns ?code=...&state=...)
  const isCallback = !!(location.search.includes("code=") && location.search.includes("state="));

  // Auto-trigger interactive login on app load when auth is enabled
  // but avoid doing so while SDK is processing a callback or while loading.
  useEffect(() => {
    if (!authDisabled && !isLoading && !isAuthenticated && !isCallback) {
      loginWithRedirect({ appState: { returnTo: "/app/overview" } });
    }
  }, [authDisabled, isLoading, isAuthenticated, isCallback, loginWithRedirect]);

  if (isLoading || isCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/overview" replace />;
  }

  // If auth is disabled, show login button UI (or let developer disable auth for local work)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Tracker Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in to view your tracker analytics.</p>
        <button
          onClick={() => loginWithRedirect({ appState: { returnTo: "/app/overview" } })}
          className="mt-5 w-full rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
        >
          Log in
        </button>
      </div>
    </div>
  );
}

// Callback component for Auth0 redirect
function Callback() {
  const { isLoading, isAuthenticated, error } = useAuth0();

  useEffect(() => {
    console.log("Callback: isLoading=", isLoading, "isAuthenticated=", isAuthenticated, "error=", error);
  }, [isLoading, isAuthenticated, error]);

  if (error) {
    console.error("Auth0 callback error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md bg-red-50 border border-red-300 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Authentication Error</h2>
          <p className="text-sm text-red-700">{error.message}</p>
          <button
            onClick={() => window.location.href = "/"}
            className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    console.log("✅ Authentication successful, redirecting to /app/overview");
    return <Navigate to="/app/overview" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Completing authentication…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/callback" element={<Callback />} />

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