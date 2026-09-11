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

import {
  LocalStorageHabitRepository,
} from "./habits/localStorageHabitRepository";

import type {
  HabitRepository,
} from "./habits/habitRepository";

import {
  LocalStorageExecutionHistoryRepository,
} from "./execution/localStorageExecutionHistoryRepository";

import type {
  ExecutionHistoryRepository,
} from "./execution/executionHistoryRepository";

import {
  LocalStorageCaptureRepository,
  LocalStorageProfileRepository,
} from "./profileCapture/localStorageProfileCaptureRepositories";

import type {
  ProfileRepository,
} from "./profileCapture/profileCaptureRepositories";

import type {
  AsyncCaptureRepository,
} from "./captures/asyncCaptureRepository";

import {
  PowerSyncCaptureRepository,
} from "./captures/powerSyncCaptureRepository";

import {
  createLifeOSPowerSyncDatabase,
} from "./database/createLifeOSPowerSyncDatabase";

import {
  LocalStorageAtlasMemoryRepository,
} from "./atlasMemory/localStorageAtlasMemoryRepository";

import type {
  AtlasMemoryRepository,
} from "./atlasMemory/atlasMemoryRepository";

import {
  LocalStorageNotificationStateRepository,
} from "./notifications/localStorageNotificationStateRepository";

import type {
  NotificationStateRepository,
} from "./notifications/notificationStateRepository";

import {
  ExecutionHistoryService,
} from "../services/ExecutionHistoryService";

export interface DataServices {
  taskRepository: TaskRepository;
  lifeGoalRepository: LifeGoalRepository;
  monthlyOutcomeRepository: MonthlyOutcomeRepository;
  weeklyFocusRepository: WeeklyFocusRepository;
  habitRepository: HabitRepository;
  executionHistoryRepository: ExecutionHistoryRepository;
  profileRepository: ProfileRepository;
  captureRepository: AsyncCaptureRepository;
  atlasMemoryRepository: AtlasMemoryRepository;
  notificationStateRepository: NotificationStateRepository;
}

interface DataServicesProviderProps {
  children: ReactNode;
  services?: DataServices;
}

const DataServicesContext = createContext<DataServices | null>(null);

let browserDataServices: DataServices | undefined;

function createBrowserDataServices(): DataServices {
  if (browserDataServices) return browserDataServices;

  const localStorageCaptureRepository = new LocalStorageCaptureRepository(
    window.localStorage,
    window
  );

  browserDataServices = {
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
    habitRepository: new LocalStorageHabitRepository(
      window.localStorage,
      window
    ),
    executionHistoryRepository: new LocalStorageExecutionHistoryRepository(
      window.localStorage,
      window
    ),
    profileRepository: new LocalStorageProfileRepository(
      window.localStorage,
      window
    ),
    captureRepository: new PowerSyncCaptureRepository(
      createLifeOSPowerSyncDatabase(),
      localStorageCaptureRepository
    ),
    atlasMemoryRepository: new LocalStorageAtlasMemoryRepository(
      window.localStorage,
      window
    ),
    notificationStateRepository: new LocalStorageNotificationStateRepository(
      window.localStorage,
      window
    ),
  };

  return browserDataServices;
}

export function DataServicesProvider({
  children,
  services,
}: DataServicesProviderProps) {
  const [resolvedServices] = useState<DataServices>(() => {
    const resolved = services ?? createBrowserDataServices();
    ExecutionHistoryService.configureRepository(
      resolved.executionHistoryRepository
    );
    return resolved;
  });

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
