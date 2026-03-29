import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { useAuthStore } from "./stores/authStore";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import App from "./App";

useAuthStore.getState().initialize();

const root = document.getElementById("root");

if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
