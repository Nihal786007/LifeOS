import {
  createContext,
  useContext,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  LocalStorageTaskRepository,
} from "./tasks/localStorageTaskRepository";

import {
  LocalStorageLifeGoalRepository,
  LocalStorageMonthlyOutcomeRepository,
  LocalStorageWeeklyFocusRepository,
} from "./planning/localStoragePlanningRepositories";

import type {
  LifeGoalRepository,
  MonthlyOutcomeRepository,
  WeeklyFocusRepository,
} from "./planning/planningRepositories";

import type {
  TaskRepository,
} from "./tasks/taskRepository";

export interface DataServices {
  taskRepository: TaskRepository;
  lifeGoalRepository: LifeGoalRepository;
  monthlyOutcomeRepository: MonthlyOutcomeRepository;
  weeklyFocusRepository: WeeklyFocusRepository;
}

interface DataServicesProviderProps {
  children: ReactNode;
  services?: DataServices;
}

const DataServicesContext = createContext<DataServices | null>(null);

function createBrowserDataServices(): DataServices {
  return {
    taskRepository: new LocalStorageTaskRepository(
      window.localStorage,
      window
    ),
    lifeGoalRepository: new LocalStorageLifeGoalRepository(
      window.localStorage,
      window
    ),
    monthlyOutcomeRepository: new LocalStorageMonthlyOutcomeRepository(
      window.localStorage,
      window
    ),
    weeklyFocusRepository: new LocalStorageWeeklyFocusRepository(
      window.localStorage,
      window
    ),
  };
}

export function DataServicesProvider({
  children,
  services,
}: DataServicesProviderProps) {
  const [resolvedServices] = useState<DataServices>(
    () => services ?? createBrowserDataServices()
  );

  return (
    <DataServicesContext.Provider value={resolvedServices}>
      {children}
    </DataServicesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDataServices(): DataServices {
  const services = useContext(DataServicesContext);
  if (!services) {
    throw new Error(
      "useDataServices must be used inside DataServicesProvider"
    );
  }

  return services;
}
