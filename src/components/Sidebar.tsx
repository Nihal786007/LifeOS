import {
  useEffect,
} from "react";

import {
  FaHouse,
  FaListCheck,
  FaRobot,
  FaCalendarDays,
  FaChartLine,
  FaFire,
  FaGear,
  FaTableList,
  FaXmark,
} from "react-icons/fa6";

type SidebarProps = {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  mobileOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({
  currentPage,
  setCurrentPage,
  mobileOpen,
  onClose,
}: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    mobileOpen,
    onClose,
  ]);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <FaHouse />,
    },
    {
      id: "atlas",
      label: "Ask ATLAS",
      icon: <FaRobot />,
    },
    {
      id: "planning",
      label: "Planning",
      icon: <FaListCheck />,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: <FaTableList />,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <FaCalendarDays />,
    },
    {
      id: "statistics",
      label: "Analytics",
      icon: <FaChartLine />,
    },
    {
      id: "habits",
      label: "Habits",
      icon: <FaFire />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <FaGear />,
    },
  ];

  function navigateTo(
    page: string
  ) {
    setCurrentPage(
      page
    );

    onClose();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

    <aside
      id="lifeos-primary-navigation"
      aria-label="Primary navigation"
      className={`fixed inset-y-0 left-0 z-[70] flex h-dvh w-[min(18rem,calc(100vw-2rem))] shrink-0 flex-col border-r border-slate-800 bg-slate-950 shadow-2xl shadow-black/40 transition-transform duration-300 ease-out lg:static lg:z-auto lg:h-full lg:w-72 lg:translate-x-0 lg:shadow-none ${
        mobileOpen
          ? "translate-x-0"
          : "-translate-x-full"
      }`}
    >

      {/* Logo */}

      <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-6 lg:px-8 lg:py-8">

        <div>

        <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          LifeOS
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Personal Operating System
        </p>

        </div>

        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 lg:hidden"
        >
          <FaXmark />
        </button>

      </div>

      {/* Navigation */}

      <nav className="flex-1 overflow-y-auto px-5 py-6 lg:py-8">

        <p className="mb-5 px-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Navigation
        </p>

        <div className="space-y-2">

          {menuItems.map((item) => {
            const active =
              currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() =>
                  navigateTo(
                    item.id
                  )
                }
                className={`
                  group
                  flex
                  w-full
                  items-center
                  gap-4
                  rounded-2xl
                  px-4
                  py-3
                  transition-all
                  duration-300

                  ${
                    active
                      ? "border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/10"
                      : "border border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-white"
                  }
                `}
              >
                <div
                  className={`
                    text-lg
                    transition-transform
                    duration-300

                    ${
                      active
                        ? "scale-110"
                        : "group-hover:translate-x-1"
                    }
                  `}
                >
                  {item.icon}
                </div>

                <span className="font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}

        </div>

      </nav>

      {/* ATLAS */}

      <button
        type="button"
        onClick={() =>
          navigateTo(
            "atlas"
          )
        }
        className="mx-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
      >

        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
          ATLAS
        </p>

        <h3 className="mt-3 font-semibold text-white">
          Mission Control
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          Open Intelligence
        </p>

      </button>

      {/* Profile */}

      <div className="border-t border-slate-800 px-6 py-6">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 font-bold text-slate-950">
            NA
          </div>

          <div>

            <h3 className="font-semibold text-white">
              Nihal Arfain Ahmed
            </h3>

            <p className="text-sm text-slate-400">
              Builder Mode
            </p>

          </div>

        </div>

      </div>

    </aside>
    </>
  );
}
