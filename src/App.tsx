import { useState } from "react";
import { AppProvider } from "./context/AppContext";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import MonthlyTracker from "./pages/MonthlyTracker";
import Tasks from "./pages/Tasks";
import Statistics from "./pages/Statistics";
import Habits from "./pages/Habits";
import Settings from "./pages/Settings";

export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  return (
    <AppProvider>
      <div className="flex h-screen bg-slate-950 text-white">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />

        <main className="flex-1 overflow-auto p-8 space-y-8">
          <TopBar />

          {currentPage === "dashboard" && <Dashboard />}
          {currentPage === "calendar" && <Calendar />}
          {currentPage === "monthly" && <MonthlyTracker />}
          {currentPage === "tasks" && <Tasks />}
          {currentPage === "statistics" && <Statistics />}
          {currentPage === "habits" && <Habits />}
          {currentPage === "settings" && <Settings />}
        </main>
      </div>
    </AppProvider>
  );
}