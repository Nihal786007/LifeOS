import {
  useMemo,
  useState,
} from "react";

import {
  FaBars,
} from "react-icons/fa6";

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

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  atlas: "Ask ATLAS",
  planning: "Planning",
  tasks: "Tasks",
  calendar: "Calendar",
  statistics: "Analytics",
  habits: "Habits",
  settings: "Settings",
};

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

  const [
    navigationOpen,
    setNavigationOpen,
  ] = useState(false);

  const {
    addCapture,
  } = useApp();

  return (
    <>
      {import.meta.env.DEV && (
        <AtlasLocalReasoningProbe />
      )}

      <div className="flex h-dvh min-h-0 overflow-hidden bg-slate-950 text-white">

      <Sidebar
        currentPage={
          currentPage
        }
        setCurrentPage={
          setCurrentPage
        }
        mobileOpen={
          navigationOpen
        }
        onClose={() =>
          setNavigationOpen(
            false
          )
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">

      <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur lg:hidden">

        <button
          type="button"
          aria-label="Open navigation menu"
          aria-controls="lifeos-primary-navigation"
          aria-expanded={
            navigationOpen
          }
          onClick={() =>
            setNavigationOpen(
              true
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <FaBars />
        </button>

        <div className="min-w-0 px-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
            LifeOS
          </p>

          <p className="truncate text-sm font-semibold text-white">
            {
              PAGE_TITLES[
                currentPage
              ] ?? "LifeOS"
            }
          </p>
        </div>

        <button
          type="button"
          aria-label="Open Ask ATLAS"
          onClick={() => {
            setCurrentPage(
              "atlas"
            );

            setNavigationOpen(
              false
            );
          }}
          className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          ATLAS
        </button>

      </header>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:p-8">

        {currentPage ===
          "dashboard" && (
          <Dashboard
            orchestrator={atlasOrchestrator}
            onNavigate={setCurrentPage}
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
          "settings" && (
          <Settings />
        )}

      </main>

      </div>

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
