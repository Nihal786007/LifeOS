import type { ReactNode, RefObject } from "react";
import { FaBars } from "react-icons/fa6";
import Sidebar from "./Sidebar";

interface AppShellProps {
 currentPage: string;
 setCurrentPage(page: string): void;
 navigationOpen: boolean;
 setNavigationOpen(open: boolean): void;
 mainContentRef: RefObject<HTMLElement | null>;
 notificationCenter?: ReactNode;
 floatingControls?: ReactNode;
 children: ReactNode;
}

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  atlas: "Ask ATLAS",
  planning: "Planning",
  tasks: "Tasks",
  calendar: "Calendar",
  statistics: "Analytics",
  habits: "Habits",
  reviews: "Reviews",
  decisions: "Decisions",
  settings: "Settings",
};


// Production shell extracted with its original markup and responsive classes.
export default function AppShell({ currentPage, setCurrentPage, navigationOpen, setNavigationOpen, mainContentRef, notificationCenter, floatingControls, children }: AppShellProps) {
 return (
      <div className="flex h-dvh min-h-0 overflow-hidden bg-lifeos-app text-lifeos-text">

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

      <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-lifeos-divider bg-lifeos-surface px-4 py-3 lg:hidden">

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
          className="mr-12 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          ATLAS
        </button>

      </header>

      {notificationCenter}

      <main
        ref={mainContentRef}
        className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:p-8"
      >

        {children}

      </main>

      </div>

      {floatingControls}
      </div>
 );
}
