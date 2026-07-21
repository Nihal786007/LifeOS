import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";
import type {
  Habit,
  Task,
  UserProfile,
} from "../shared/types";

type AppContextType = {
  // =========================
  // Tasks
  // =========================

  tasks: Task[];
  addTask: (text: string) => void;
  toggleTask: (id: number) => void;
  deleteTask: (id: number) => void;
  completedTasks: number;

  // =========================
  // Habits
  // =========================

  habits: Habit[];
  addHabit: (name: string) => void;
  toggleHabit: (id: number) => void;
  deleteHabit: (id: number) => void;

  // =========================
  // User Profile
  // =========================

  profile: UserProfile;
  updateProfile: (
    data: Partial<UserProfile>
  ) => void;
};

const AppContext =
  createContext<AppContextType | null>(null);

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  // =========================
  // TASKS
  // =========================

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved =
      localStorage.getItem("lifeos-tasks");

    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "lifeos-tasks",
      JSON.stringify(tasks)
    );
  }, [tasks]);

  function addTask(title: string) {
  if (!title.trim()) return;

  setTasks((prev) => [
    ...prev,
    {
      id: Date.now(),

      title: title.trim(),
      description: "",

      completed: false,
      completedAt: undefined,

      dueDate: new Date().toISOString().split("T")[0],

      priority: "medium",

      missionId: undefined,

      xp: 10,

      createdAt: new Date().toISOString(),
    },
  ]);
}

  function toggleTask(id: number) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;

        const completed =
          !task.completed;

        return {
          ...task,
          completed,
          completedAt: completed
            ? new Date().toISOString()
            : undefined,
        };
      })
    );
  }

  function deleteTask(id: number) {
    setTasks((prev) =>
      prev.filter(
        (task) => task.id !== id
      )
    );
  }
    // =========================
  // HABITS
  // =========================

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem("lifeos-habits");

    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "lifeos-habits",
      JSON.stringify(habits)
    );
  }, [habits]);

  function addHabit(name: string) {
    if (!name.trim()) return;

    setHabits((prev) => [
      ...prev,
      {
        id: Date.now(),
        name,
        streak: 0,
        completedToday: false,
      },
    ]);
  }

  function toggleHabit(id: number) {
    setHabits((prev) =>
      prev.map((habit) =>
        habit.id === id
          ? {
              ...habit,
              completedToday: !habit.completedToday,
              streak: !habit.completedToday
                ? habit.streak + 1
                : Math.max(habit.streak - 1, 0),
            }
          : habit
      )
    );
  }

  function deleteHabit(id: number) {
    setHabits((prev) =>
      prev.filter(
        (habit) => habit.id !== id
      )
    );
  }

  // =========================
  // USER PROFILE
  // =========================

  const [profile, setProfile] =
    useState<UserProfile>(() => {
      const saved =
        localStorage.getItem(
          "lifeos-profile"
        );

      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore invalid saved data
        }
      }

      return {
        name: "",
        occupation: "",
        timezone: "Asia/Kolkata",
        theme: "dark",
        atlasPersonality: "Professional",
        level: 1,
        xp: 0,
      };
    });

  useEffect(() => {
    localStorage.setItem(
      "lifeos-profile",
      JSON.stringify(profile)
    );
  }, [profile]);

  function updateProfile(
    data: Partial<UserProfile>
  ) {
    setProfile((prev) => ({
      ...prev,
      ...data,
    }));
  }
    return (
    <AppContext.Provider
      value={{
        // =========================
        // Tasks
        // =========================
        tasks,
        addTask,
        toggleTask,
        deleteTask,
        completedTasks: tasks.filter(
          (task) => task.completed
        ).length,

        // =========================
        // Habits
        // =========================
        habits,
        addHabit,
        toggleHabit,
        deleteHabit,

        // =========================
        // User Profile
        // =========================
        profile,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "useApp must be used inside AppProvider"
    );
  }

  return context;
}