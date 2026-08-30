import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  Capture,
  UserProfile,
} from "../shared/types";

type AppContextType = {
  // =========================
  // CAPTURE
  // =========================

  captures:
    Capture[];

  addCapture: (
    text: string
  ) => void;

  deleteCapture: (
    id: number
  ) => void;

  // =========================
  // PROFILE
  // =========================

  profile:
    UserProfile;

  updateProfile: (
    data: Partial<UserProfile>
  ) => void;
};

const AppContext =
  createContext<
    AppContextType | null
  >(
    null
  );

export function AppProvider({
  children,
}: {
  children:
    ReactNode;
}) {
  // =========================
  // QUICK CAPTURE
  // =========================

  const [
    captures,
    setCaptures,
  ] =
    useState<
      Capture[]
    >(
      () => {
        const saved =
          localStorage.getItem(
            "lifeos-captures"
          );

        if (!saved) {
          return [];
        }

        try {
          return JSON.parse(
            saved
          );
        } catch {
          return [];
        }
      }
    );

  useEffect(() => {
    localStorage.setItem(
      "lifeos-captures",
      JSON.stringify(
        captures
      )
    );
  }, [
    captures,
  ]);

  function addCapture(
    text: string
  ) {
    const trimmedText =
      text.trim();

    if (!trimmedText) {
      return;
    }

    setCaptures(
      (prev) => [
        {
          id:
            Date.now(),

          text:
            trimmedText,

          createdAt:
            new Date().toISOString(),
        },

        ...prev,
      ]
    );
  }

  function deleteCapture(
    id: number
  ) {
    setCaptures(
      (prev) =>
        prev.filter(
          (capture) =>
            capture.id !==
            id
        )
    );
  }

  // =========================
  // USER PROFILE
  // =========================

  const [
    profile,
    setProfile,
  ] =
    useState<
      UserProfile
    >(
      () => {
        const saved =
          localStorage.getItem(
            "lifeos-profile"
          );

        if (saved) {
          try {
            return JSON.parse(
              saved
            );
          } catch {
            // Ignore invalid
            // stored profile data.
          }
        }

        return {
          name:
            "",

          occupation:
            "",

          timezone:
            "Asia/Kolkata",

          theme:
            "dark",

          atlasPersonality:
            "Professional",

          level:
            1,

          xp:
            0,
        };
      }
    );

  useEffect(() => {
    localStorage.setItem(
      "lifeos-profile",
      JSON.stringify(
        profile
      )
    );
  }, [
    profile,
  ]);

  function updateProfile(
    data:
      Partial<UserProfile>
  ) {
    setProfile(
      (prev) => ({
        ...prev,
        ...data,
      })
    );
  }

  return (
    <AppContext.Provider
      value={{
        // =========================
        // QUICK CAPTURE
        // =========================

        captures,
        addCapture,
        deleteCapture,

        // =========================
        // USER PROFILE
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
  const context =
    useContext(
      AppContext
    );

  if (!context) {
    throw new Error(
      "useApp must be used inside AppProvider"
    );
  }

  return context;
}