import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  Capture,
  UserProfile,
} from "../shared/types";

import {
  useDataServices,
} from "../data/DataServicesContext";

function createDefaultProfile(): UserProfile {
  return {
    name: "",
    occupation: "",
    timezone: "Asia/Kolkata",
    theme: "dark",
    atlasPersonality: "Professional",
    level: 1,
    xp: 0,
  };
}

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
  const {
    captureRepository,
    profileRepository,
  } = useDataServices();

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
      () => captureRepository.load()
    );

  const capturesRef = useRef(captures);

  useEffect(() => {
    return captureRepository.subscribe(() => {
      const nextCaptures = captureRepository.load();
      capturesRef.current = nextCaptures;
      setCaptures(nextCaptures);
    });
  }, [
    captureRepository,
  ]);

  function addCapture(
    text: string
  ) {
    const trimmedText =
      text.trim();

    if (!trimmedText) {
      return;
    }

    const nextCaptures = [
      {
        id: Date.now(),
        text: trimmedText,
        createdAt: new Date().toISOString(),
      },
      ...capturesRef.current,
    ];

    capturesRef.current = nextCaptures;
    setCaptures(nextCaptures);
    captureRepository.save(nextCaptures);
  }

  function deleteCapture(
    id: number
  ) {
    const nextCaptures = capturesRef.current.filter(
      (capture) => capture.id !== id
    );

    if (nextCaptures.length === capturesRef.current.length) return;

    capturesRef.current = nextCaptures;
    setCaptures(nextCaptures);
    captureRepository.save(nextCaptures);
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
      () => profileRepository.load() ?? createDefaultProfile()
    );

  const profileRef = useRef(profile);

  useEffect(() => {
    return profileRepository.subscribe(() => {
      const nextProfile = profileRepository.load() ?? createDefaultProfile();
      profileRef.current = nextProfile;
      setProfile(nextProfile);
    });
  }, [
    profileRepository,
  ]);

  function updateProfile(
    data:
      Partial<UserProfile>
  ) {
    const currentProfile = profileRef.current;
    const changed = (
      Object.keys(data) as (keyof UserProfile)[]
    ).some((key) => currentProfile[key] !== data[key]);

    if (!changed) return;

    const nextProfile = {
      ...currentProfile,
      ...data,
    };

    profileRef.current = nextProfile;
    setProfile(nextProfile);
    profileRepository.save(nextProfile);
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

// eslint-disable-next-line react-refresh/only-export-components
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
