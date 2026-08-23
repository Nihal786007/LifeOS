// ==========================================
// LifeOS App Providers
// Version: 3.0
// ==========================================

import type { ReactNode } from "react";

import { AppProvider } from "../context/AppContext";
import { LifeGoalsProvider } from "../context/LifeGoalsContext";
import { MonthlyPlanningProvider } from "../context/MonthlyPlanningContext";
import { WeeklyPlanningProvider } from "../context/WeeklyPlanningContext";
import { TaskProvider } from "../context/TaskContext";
import { XPProvider } from "../context/XPContext";
import { PlanningExecutionProvider } from "../context/PlanningExecutionContext";

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
              <XPProvider>
                <PlanningExecutionProvider>
                  {children}
                </PlanningExecutionProvider>
              </XPProvider>
            </WeeklyPlanningProvider>
          </TaskProvider>
        </MonthlyPlanningProvider>
      </LifeGoalsProvider>
    </AppProvider>
  );
}