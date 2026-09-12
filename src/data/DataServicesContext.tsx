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
  AsyncPlanningRepository,
} from "./planning/asyncPlanningRepository";

import {
  PowerSyncPlanningRepository,
} from "./planning/powerSyncPlanningRepository";

import type {
  AsyncTaskRepository,
} from "./tasks/asyncTaskRepository";

import {
  PowerSyncTaskRepository,
} from "./tasks/powerSyncTaskRepository";

import {
  LocalStorageHabitRepository,
} from "./habits/localStorageHabitRepository";

import type {
  AsyncHabitRepository,
} from "./habits/asyncHabitRepository";

import {
  PowerSyncHabitRepository,
} from "./habits/powerSyncHabitRepository";

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
  taskRepository: AsyncTaskRepository;
  planningRepository: AsyncPlanningRepository;
  habitRepository: AsyncHabitRepository;
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

  const localStorageTaskRepository = new LocalStorageTaskRepository(
    window.localStorage,
    window
  );

  const localStorageLifeGoalRepository =
    new LocalStorageLifeGoalRepository(window.localStorage, window);
  const localStorageMonthlyOutcomeRepository =
    new LocalStorageMonthlyOutcomeRepository(window.localStorage, window);
  const localStorageWeeklyFocusRepository =
    new LocalStorageWeeklyFocusRepository(window.localStorage, window);

  const powerSyncDatabase = createLifeOSPowerSyncDatabase();

  const localStorageHabitRepository = new LocalStorageHabitRepository(
    window.localStorage,
    window
  );

  browserDataServices = {
    taskRepository: new PowerSyncTaskRepository(
      powerSyncDatabase,
      localStorageTaskRepository
    ),
    planningRepository: new PowerSyncPlanningRepository(
      powerSyncDatabase,
      {
        lifeGoals: localStorageLifeGoalRepository,
        monthlyOutcomes: localStorageMonthlyOutcomeRepository,
        weeklyFocuses: localStorageWeeklyFocusRepository,
      }
    ),
    habitRepository: new PowerSyncHabitRepository(
      powerSyncDatabase,
      localStorageHabitRepository
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
      powerSyncDatabase,
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
