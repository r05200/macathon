import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import "./index.css";
import App from "./App";

const authDisabled = import.meta.env.VITE_AUTH_DISABLED === "true";

const Root = (
  <StrictMode>
    {authDisabled ? (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    ) : (
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: `${window.location.origin}/callback`,
          scope: "openid profile email"
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Auth0Provider>
    )}
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(Root);