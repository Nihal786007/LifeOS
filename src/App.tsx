import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useApp } from "./context/AppContext";

import AppShell from "./components/AppShell";

import CaptureFab from "./components/capture/CaptureFab";
import CaptureModal from "./components/capture/CaptureModal";
import NotificationCenter from "./components/notifications/NotificationCenter";

import DailyCommandCenter from "./dashboard/DailyCommandCenter";
import Planning from "./pages/Planning";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import Statistics from "./pages/Statistics";
import Habits from "./pages/Habits";
import Settings from "./pages/Settings";
import Atlas from "./pages/Atlas";
import Reviews from "./pages/Reviews";
import Decisions from "./pages/Decisions";
import FocusMode from "./focus/FocusMode";
import { useFocusSession } from "./focus/useFocusSession";

import {
  createAtlasAIOrchestrator,
} from "./atlas/composition/createLocalAtlasAIOrchestrator";

import {
  AtlasLocalReasoningProbe,
} from "./atlas/localReasoning/AtlasLocalReasoningProbe";


function AppContent() {
  const mainContentRef = useRef<HTMLElement>(null);

  const atlasOrchestrator = useMemo(
    () => createAtlasAIOrchestrator(),
    []
  );

  const [
    currentPage,
    setCurrentPage,
  ] = useState("dashboard");

  const [
    captureOpen,
    setCaptureOpen,
  ] = useState(false);

  const [
    navigationOpen,
    setNavigationOpen,
  ] = useState(false);

  const [
    focusRequestedTaskId,
    setFocusRequestedTaskId,
  ] = useState<number | undefined>();

  const focusController = useFocusSession();

  const {
    addCapture,
  } = useApp();

  useEffect(() => {
    mainContentRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [currentPage]);

  function openFocus(taskId?: number) {
    setFocusRequestedTaskId(taskId);
    setNavigationOpen(false);
    setCurrentPage("focus");
  }

  if (currentPage === "focus" || focusController.session || focusController.outcome) {
    return (
      <FocusMode
        orchestrator={atlasOrchestrator}
        controller={focusController}
        initialTaskId={focusRequestedTaskId}
        onContinue={() => setCurrentPage("focus")}
        onExit={() => {
          setFocusRequestedTaskId(undefined);
          setCurrentPage("dashboard");
        }}
      />
    );
  }

  return (
    <>
      {import.meta.env.DEV && (
        <AtlasLocalReasoningProbe />
      )}

      <AppShell
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        navigationOpen={navigationOpen}
        setNavigationOpen={setNavigationOpen}
        mainContentRef={mainContentRef}
        notificationCenter={<NotificationCenter orchestrator={atlasOrchestrator} />}
        floatingControls={<>
      <CaptureFab
        onClick={() =>
          setCaptureOpen(
            true
          )
        }
      />

      <CaptureModal
        open={
          captureOpen
        }
        onClose={() =>
          setCaptureOpen(
            false
          )
        }
        onCapture={
          addCapture
        }
      />

        </>}
      >
        {currentPage ===
          "dashboard" && (
          <DailyCommandCenter
            orchestrator={atlasOrchestrator}
            onNavigate={setCurrentPage}
            onOpenCapture={() => setCaptureOpen(true)}
            onStartFocus={openFocus}
          />
        )}

        {currentPage ===
          "atlas" && (
          <Atlas
            orchestrator={atlasOrchestrator}
          />
        )}

        {currentPage ===
          "planning" && (
          <Planning
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage ===
          "tasks" && (
          <Tasks />
        )}

        {currentPage ===
          "calendar" && (
          <Calendar
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage ===
          "statistics" && (
          <Statistics />
        )}

        {currentPage ===
          "habits" && (
          <Habits />
        )}

        {currentPage ===
          "reviews" && (
          <Reviews onCreateLifeGoal={() => setCurrentPage("planning")} />
        )}

        {currentPage ===
          "settings" && (
          <Settings />
        )}
        {currentPage === "decisions" && <Decisions />}

      </AppShell>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
