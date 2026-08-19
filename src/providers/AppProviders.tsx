// ==========================================
// LifeOS App Providers
// Version: 1.0
// ==========================================

import type { ReactNode } from "react";

import { AppProvider } from "../context/AppContext";
import { LifeGoalsProvider } from "../context/LifeGoalsContext";
import { MonthlyPlanningProvider } from "../context/MonthlyPlanningContext";
import { WeeklyPlanningProvider } from "../context/WeeklyPlanningContext";
import { TaskProvider } from "../context/TaskContext";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({
  children,
}: AppProvidersProps) {
  return (
    <AppProvider>
      <LifeGoalsProvider>
        <MonthlyPlanningProvider>
          <TaskProvider>
            <WeeklyPlanningProvider>
              {children}
            </WeeklyPlanningProvider>
          </TaskProvider>
        </MonthlyPlanningProvider>
      </LifeGoalsProvider>
    </AppProvider>
  );
}