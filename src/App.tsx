import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import AppShell from "./layout/AppShell";
import Overview from "./pages/Overview";
import Trackers from "./pages/Trackers";
import Companies from "./pages/Companies";
import Trends from "./pages/Trends";
import Settings from "./pages/Settings";

import { useAuth0 } from "@auth0/auth0-react";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";

const authDisabled = import.meta.env.VITE_AUTH_DISABLED === 'true';

function Landing() {
  const location = useLocation();

  if (authDisabled) {
    return <Navigate to="/app/overview" replace />;
  }

  const { isAuthenticated, isLoading, loginWithRedirect, error } = useAuth0();

  console.log('[Landing] State:', {
    isAuthenticated,
    isLoading,
    error,
    location: location.pathname + location.search
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log("[Landing] User authenticated, redirecting to app");
    }
  }, [isLoading, isAuthenticated]);

  const isCallback = !!(location.search.includes("code=") && location.search.includes("state="));

  console.log('[Landing] isCallback:', isCallback, 'search:', location.search);

  useEffect(() => {
    console.log('[Landing] Login effect:', { isLoading, isAuthenticated, isCallback });
    if (!isLoading && !isAuthenticated && !isCallback) {
      console.log('[Landing] Triggering loginWithRedirect');
      loginWithRedirect({ appState: { returnTo: location.pathname + location.search } })
        .catch(err => console.error('[Landing] Login error:', err));
    }
  }, [isLoading, isAuthenticated, isCallback, loginWithRedirect, location.pathname, location.search]);

  if (error) {
    console.error('[Landing] Auth0 Error:', error);
    
    // If it's an invalid state error, clear storage and retry
    if (error.message.includes('Invalid state')) {
      console.log('[Landing] Invalid state detected, clearing auth storage and retrying...');
      localStorage.removeItem(`@@auth0spajs@@::${import.meta.env.VITE_AUTH0_CLIENT_ID}::${import.meta.env.VITE_AUTH0_DOMAIN}::openid profile email`);
      localStorage.removeItem('a0.spajs.txs');
      window.location.href = '/';
      return null;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div className="p-6 bg-white rounded shadow text-center">
          <h2 className="text-lg font-semibold text-red-600">Authentication Error</h2>
          <p className="mt-2">{error.message}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/overview" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      <div className="p-6 bg-white rounded shadow text-center">
        <h2 className="text-lg font-semibold">Redirecting to sign in…</h2>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

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
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
