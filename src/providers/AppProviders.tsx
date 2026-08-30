// ==========================================
// LifeOS App Providers
// Version: 3.2
// ==========================================

import type {
  ReactNode,
} from "react";

import {
  AppProvider,
} from "../context/AppContext";

import {
  LifeGoalsProvider,
} from "../context/LifeGoalsContext";

import {
  MonthlyPlanningProvider,
} from "../context/MonthlyPlanningContext";

import {
  WeeklyPlanningProvider,
} from "../context/WeeklyPlanningContext";

import {
  TaskProvider,
} from "../context/TaskContext";

import {
  XPProvider,
} from "../context/XPContext";

import {
  PlanningExecutionProvider,
} from "../context/PlanningExecutionContext";

import {
  HabitProvider,
} from "../context/HabitContext";

import {
  HabitExecutionProvider,
} from "../context/HabitExecutionContext";

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
                <HabitProvider>
                  <HabitExecutionProvider>
                    <PlanningExecutionProvider>
                      {children}
                    </PlanningExecutionProvider>
                  </HabitExecutionProvider>
                </HabitProvider>
              </XPProvider>
            </WeeklyPlanningProvider>
          </TaskProvider>
        </MonthlyPlanningProvider>
      </LifeGoalsProvider>
    </AppProvider>
  );
}