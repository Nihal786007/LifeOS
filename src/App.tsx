import { useState } from "react";

import { useApp } from "./context/AppContext";

import ProgressEngine from "./context/ProgressEngine";

import Sidebar from "./components/Sidebar";

import CaptureFab from "./components/capture/CaptureFab";
import CaptureModal from "./components/capture/CaptureModal";

import Dashboard from "./pages/Dashboard";
import Planning from "./pages/Planning";
import Calendar from "./pages/Calendar";
import Statistics from "./pages/Statistics";
import Habits from "./pages/Habits";
import Settings from "./pages/Settings";

function AppContent() {
  const [currentPage, setCurrentPage] =
    useState("dashboard");

  const [captureOpen, setCaptureOpen] =
    useState(false);

  const { addCapture } = useApp();

  return (
    <div className="flex h-screen bg-slate-950 text-white">

      <ProgressEngine />

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      <main className="flex-1 overflow-auto p-8 space-y-8">

        {currentPage === "dashboard" && (
          <Dashboard />
        )}

        {currentPage === "planning" && (
          <Planning />
        )}

        {currentPage === "calendar" && (
          <Calendar />
        )}

        {currentPage === "statistics" && (
          <Statistics />
        )}

        {currentPage === "habits" && (
          <Habits />
        )}

        {currentPage === "settings" && (
          <Settings />
        )}

      </main>

      <CaptureFab
        onClick={() =>
          setCaptureOpen(true)
        }
      />

      <CaptureModal
        open={captureOpen}
        onClose={() =>
          setCaptureOpen(false)
        }
        onCapture={addCapture}
      />

    </div>
  );
}

export default function App() {
  return <AppContent />;
}