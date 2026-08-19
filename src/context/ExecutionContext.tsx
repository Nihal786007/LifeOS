import { STORAGE_KEYS } from "../constants/storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import type {
  ExecutionRecord,
} from "../shared/execution";

interface ExecutionContextType {
  executionRecords: ExecutionRecord[];

  addExecutionRecord: (
    record: Omit<
      ExecutionRecord,
      "id" | "createdAt"
    >
  ) => void;

  deleteExecutionRecord: (
    id: number
  ) => void;

  clearExecutionHistory: () => void;

  getLatestRecords: (
    count: number
  ) => ExecutionRecord[];
}

const ExecutionContext =
  createContext<ExecutionContextType | null>(
    null
  );

export function ExecutionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    executionRecords,
    setExecutionRecords,
  ] = useState<ExecutionRecord[]>(() => {
    const saved =
      localStorage.getItem(
        STORAGE_KEYS.EXECUTION_HISTORY
      );

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  useEffect(() => {
   localStorage.setItem(
  STORAGE_KEYS.EXECUTION_HISTORY,
      JSON.stringify(executionRecords)
    );
  }, [executionRecords]);

  function addExecutionRecord(
    record: Omit<
      ExecutionRecord,
      "id" | "createdAt"
    >
  ) {
    setExecutionRecords((prev) => [
      {
        id: Date.now(),
        createdAt:
          new Date().toISOString(),
        ...record,
      },
      ...prev,
    ]);
  }

  function deleteExecutionRecord(
    id: number
  ) {
    setExecutionRecords((prev) =>
      prev.filter(
        (record) =>
          record.id !== id
      )
    );
  }

  function clearExecutionHistory() {
    setExecutionRecords([]);
  }

  function getLatestRecords(
    count: number
  ) {
    return executionRecords.slice(
      0,
      count
    );
  }

  return (
    <ExecutionContext.Provider
      value={{
        executionRecords,
        addExecutionRecord,
        deleteExecutionRecord,
        clearExecutionHistory,
        getLatestRecords,
      }}
    >
      {children}
    </ExecutionContext.Provider>
  );
}

export function useExecution() {
  const context =
    useContext(ExecutionContext);

  if (!context) {
    throw new Error(
      "useExecution must be used inside ExecutionProvider"
    );
  }

  return context;
}