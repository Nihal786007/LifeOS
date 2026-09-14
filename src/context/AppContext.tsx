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

import type {
  CapturePersistencePhase,
} from "../data/captures/asyncCaptureRepository";
import type { ProfilePersistencePhase } from "../data/profile/asyncProfileRepository";

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

  capturePersistence: {
    phase: CapturePersistencePhase;
    error: string | null;
  };

  addCapture: (
    text: string
  ) => Promise<void>;

  deleteCapture: (
    id: number
  ) => Promise<void>;

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
  ] = useState<Capture[]>([]);

  const [
    capturePersistence,
    setCapturePersistence,
  ] = useState<{
    phase: CapturePersistencePhase;
    error: string | null;
  }>({
    phase: "uninitialized",
    error: null,
  });

  const capturesRef = useRef(captures);
  const capturesHydratedRef = useRef(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;

    void captureRepository.initialize((phase) => {
      if (!active) return;
      setCapturePersistence({ phase, error: null });
    }).then((nextCaptures) => {
      if (!active) return;

      capturesHydratedRef.current = true;
      capturesRef.current = nextCaptures;
      setCaptures(nextCaptures);
      setCapturePersistence({ phase: "hydrated", error: null });

      unsubscribe = captureRepository.subscribe((event) => {
        if (!active) return;

        if (event.type === "error") {
          setCapturePersistence({
            phase: "error",
            error: event.error.message,
          });
          return;
        }

        capturesRef.current = event.captures;
        setCaptures(event.captures);
        setCapturePersistence({ phase: "hydrated", error: null });
      });
    }).catch((error: unknown) => {
      if (!active) return;
      setCapturePersistence({
        phase: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    captureRepository,
  ]);

  async function addCapture(
    text: string
  ): Promise<void> {
    const trimmedText =
      text.trim();

    if (!trimmedText) {
      return;
    }

    const hydratedCaptures = await captureRepository.initialize();
    if (!capturesHydratedRef.current) {
      capturesHydratedRef.current = true;
      capturesRef.current = hydratedCaptures;
      setCaptures(hydratedCaptures);
      setCapturePersistence({ phase: "hydrated", error: null });
    }

    const capture: Capture = {
      id: Date.now(),
      text: trimmedText,
      createdAt: new Date().toISOString(),
    };

    const nextCaptures = [
      capture,
      ...capturesRef.current,
    ];

    capturesRef.current = nextCaptures;
    setCaptures(nextCaptures);
    setCapturePersistence({ phase: "hydrated", error: null });

    try {
      await captureRepository.insert(capture);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCapturePersistence({ phase: "error", error: message });
      throw error;
    }
  }

  async function deleteCapture(
    id: number
  ): Promise<void> {
    const hydratedCaptures = await captureRepository.initialize();
    if (!capturesHydratedRef.current) {
      capturesHydratedRef.current = true;
      capturesRef.current = hydratedCaptures;
      setCaptures(hydratedCaptures);
    }

    const nextCaptures = capturesRef.current.filter(
      (capture) => capture.id !== id
    );

    if (nextCaptures.length === capturesRef.current.length) return;

    capturesRef.current = nextCaptures;
    setCaptures(nextCaptures);

    try {
      await captureRepository.delete(id);
      setCapturePersistence({ phase: "hydrated", error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCapturePersistence({ phase: "error", error: message });
      throw error;
    }
  }

  // =========================
  // USER PROFILE
  // =========================

  const [
    profile,
    setProfile,
  ] = useState<UserProfile>(createDefaultProfile);

  const [profilePersistence, setProfilePersistence] = useState<{
    phase: ProfilePersistencePhase;
    error: string | null;
  }>({ phase: "uninitialized", error: null });
  const [profileHydrated, setProfileHydrated] = useState(false);

  const profileRef = useRef(profile);
  const profileMountedRef = useRef(false);
  const profileReplacementVersionRef = useRef(0);
  const expectedWatchProfileRef = useRef<UserProfile | null>(null);
  const profileWatchBlockedAfterFailureRef = useRef(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    profileMountedRef.current = true;

    void profileRepository.initialize((phase) => {
      if (active) setProfilePersistence({ phase, error: null });
    }).then((storedProfile) => {
      if (!active) return;
      const nextProfile = storedProfile ?? createDefaultProfile();
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      setProfileHydrated(true);
      setProfilePersistence({ phase: "hydrated", error: null });

      unsubscribe = profileRepository.subscribe((event) => {
        if (!active) return;
        if (event.type === "error") {
          setProfilePersistence({ phase: "error", error: event.error.message });
          console.error("Profile persistence watch failed", event.error);
          return;
        }
        if (profileWatchBlockedAfterFailureRef.current) return;
        const next = event.profile ?? createDefaultProfile();
        const expected = expectedWatchProfileRef.current;
        if (expected) {
          if (JSON.stringify(next) !== JSON.stringify(expected)) return;
          expectedWatchProfileRef.current = null;
        }
        profileRef.current = next;
        setProfile(next);
        setProfilePersistence({ phase: "hydrated", error: null });
      });
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : String(error);
      setProfilePersistence({ phase: "error", error: message });
      console.error("Profile persistence initialization failed", error);
    });

    return () => {
      active = false;
      profileMountedRef.current = false;
      unsubscribe();
    };
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

    const version = profileReplacementVersionRef.current + 1;
    profileReplacementVersionRef.current = version;
    expectedWatchProfileRef.current = nextProfile;
    profileWatchBlockedAfterFailureRef.current = false;
    profileRef.current = nextProfile;
    setProfile(nextProfile);
    void profileRepository.replace(nextProfile).then((persisted) => {
      if (!profileMountedRef.current || version !== profileReplacementVersionRef.current) return;
      if (JSON.stringify(persisted) !== JSON.stringify(nextProfile)) {
        throw new Error("Profile persistence returned an unexpected snapshot");
      }
      setProfilePersistence({ phase: "hydrated", error: null });
    }).catch((error: unknown) => {
      if (!profileMountedRef.current) return;
      if (version === profileReplacementVersionRef.current) {
        expectedWatchProfileRef.current = null;
        profileWatchBlockedAfterFailureRef.current = true;
      }
      const message = error instanceof Error ? error.message : String(error);
      setProfilePersistence({ phase: "error", error: message });
      console.error("Profile persistence replacement failed", error);
    });
  }

  if (!profileHydrated) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-slate-950 px-6 text-center text-sm text-slate-400"
        role={profilePersistence.phase === "error" ? "alert" : "status"}
      >
        {profilePersistence.phase === "error"
          ? `Profile could not be loaded. ${profilePersistence.error ?? "Reload LifeOS to try again."}`
          : "Loading your profile…"}
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        // =========================
        // QUICK CAPTURE
        // =========================

        captures,
        capturePersistence,
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
