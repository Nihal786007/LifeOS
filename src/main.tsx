import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App";
import { AppProviders } from "./providers/AppProviders";
import { ThemeProvider } from "./theme/ThemeProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppProviders>
        <App />
      </AppProviders>
    </ThemeProvider>
  </StrictMode>
);
