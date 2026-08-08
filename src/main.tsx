import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App";

import { AppProvider } from "./context/AppContext";
import { LifeGoalsProvider } from "./context/LifeGoalsContext";
import { MonthlyPlanningProvider } from "./context/MonthlyPlanningContext";
import { WeeklyPlanningProvider } from "./context/WeeklyPlanningContext";
import { TaskProvider } from "./context/TaskContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <LifeGoalsProvider>
        <MonthlyPlanningProvider>
          <WeeklyPlanningProvider>
            <TaskProvider>
              <App />
            </TaskProvider>
          </WeeklyPlanningProvider>
        </MonthlyPlanningProvider>
      </LifeGoalsProvider>
    </AppProvider>
  </StrictMode>
);