import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App";

import { AppProvider } from "./context/AppContext";
import { LifeGoalsProvider } from "./context/LifeGoalsContext";
import { MonthlyPlanningProvider } from "./context/MonthlyPlanningContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <LifeGoalsProvider>
        <MonthlyPlanningProvider>
          <App />
        </MonthlyPlanningProvider>
      </LifeGoalsProvider>
    </AppProvider>
  </StrictMode>
);