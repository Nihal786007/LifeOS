import {
  useMemo,
  useState,
} from "react";

import { useApp } from "./context/AppContext";

import Sidebar from "./components/Sidebar";

import CaptureFab from "./components/capture/CaptureFab";
import CaptureModal from "./components/capture/CaptureModal";

import Dashboard from "./pages/Dashboard";
import Planning from "./pages/Planning";
import Tasks from "./pages/Tasks";
import Calendar from "./pages/Calendar";
import Statistics from "./pages/Statistics";
import Habits from "./pages/Habits";
import Settings from "./pages/Settings";
import Atlas from "./pages/Atlas";

import {
  createLocalAtlasAIOrchestrator,
} from "./atlas/composition/createLocalAtlasAIOrchestrator";

import {
  AtlasLocalReasoningProbe,
} from "./atlas/localReasoning/AtlasLocalReasoningProbe";

function AppContent() {
  const atlasOrchestrator = useMemo(
    () => createLocalAtlasAIOrchestrator(),
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

  const {
    addCapture,
  } = useApp();

  return (
    <>
      {import.meta.env.DEV && (
        <AtlasLocalReasoningProbe />
      )}

      <div className="flex h-screen bg-slate-950 text-white">

      <Sidebar
        currentPage={
          currentPage
        }
        setCurrentPage={
          setCurrentPage
        }
      />

      <main className="flex-1 space-y-8 overflow-auto p-8">

        {currentPage ===
          "dashboard" && (
          <Dashboard />
        )}

        {currentPage ===
          "atlas" && (
          <Atlas
            orchestrator={atlasOrchestrator}
          />
        )}

        {currentPage ===
          "planning" && (
          <Planning />
        )}

        {currentPage ===
          "tasks" && (
          <Tasks />
        )}

        {currentPage ===
          "calendar" && (
          <Calendar />
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
          "settings" && (
          <Settings />
        )}

      </main>

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

      </div>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
