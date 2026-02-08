import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import "./index.css";
import App from "./App";

const authDisabled = import.meta.env.VITE_AUTH_DISABLED === "true";

console.log("[Auth] Config:", {
  authDisabled,
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  redirectUri: window.location.origin,
  currentUrl: window.location.href,
});

const Root = (
  <>
    {authDisabled ? (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    ) : (
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: window.location.origin,
          scope: "openid profile email",
        }}
        cacheLocation="localstorage"
        useRefreshTokens={true}
        onRedirectCallback={(appState) => {
          console.log("[Auth] Redirect callback:", appState);
        }}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Auth0Provider>
    )}
  </>
);

createRoot(document.getElementById("root")!).render(Root);