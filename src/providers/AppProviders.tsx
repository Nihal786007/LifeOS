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
  PlanningStateProvider,
} from "../context/PlanningStateContext";

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

import {
  DataServicesProvider,
} from "../data/DataServicesContext";

import { AuthProvider } from "../auth/AuthContext";
import AuthDataBoundary from "../components/auth/AuthDataBoundary";
import { AccountDataProvider, useAccountData } from "../data/account/AccountDataContext";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({
  children,
}: AppProvidersProps) {
  return (
    <AuthProvider>
      <AccountDataProvider>
        <AuthDataBoundary>
          <AuthenticatedCanonicalProviders>
            {children}
          </AuthenticatedCanonicalProviders>
        </AuthDataBoundary>
      </AccountDataProvider>
    </AuthProvider>
  );
}

function AuthenticatedCanonicalProviders({ children }: AppProvidersProps) {
  const { services } = useAccountData();
  if (!services) throw new Error("Authenticated data services are unavailable");
  return (
        <DataServicesProvider services={services}>
          <AppProvider>
            <TaskProvider>
              <PlanningStateProvider>
                <LifeGoalsProvider>
                  <MonthlyPlanningProvider>
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
                  </MonthlyPlanningProvider>
                </LifeGoalsProvider>
              </PlanningStateProvider>
            </TaskProvider>
          </AppProvider>
        </DataServicesProvider>
  );
}
