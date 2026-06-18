import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initWebVitals } from "./lib/webVitals";
import { installReloadDebugger } from "./lib/debugReload";

installReloadDebugger();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

initWebVitals();

