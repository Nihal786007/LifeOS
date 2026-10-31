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
  FaClipboardCheck,
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
      id: "reviews",
      label: "Reviews",
      icon: <FaClipboardCheck />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <FaGear />,
    },
    {
      id: "decisions",
      label: "Decisions",
      icon: <FaListCheck />,
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
        className={`fixed inset-0 z-[60] bg-lifeos-overlay backdrop-blur-sm transition-opacity duration-150 lg:hidden ${
          mobileOpen
            ? "visible pointer-events-auto opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
      />

    <aside
      id="lifeos-primary-navigation"
      aria-label="Primary navigation"
      className={`fixed inset-y-0 left-0 z-[70] flex h-dvh w-[min(18rem,calc(100vw-2rem))] shrink-0 flex-col border-r border-lifeos-divider bg-lifeos-surface shadow-2xl shadow-black/20 transition-transform duration-300 ease-out lg:static lg:z-auto lg:h-full lg:w-64 lg:translate-x-0 lg:shadow-none ${
        mobileOpen
          ? "visible translate-x-0"
          : "invisible -translate-x-full lg:visible"
      }`}
    >

      {/* Logo */}

      <div className="flex items-start justify-between gap-4 border-b border-lifeos-border px-6 py-5">

        <div>

        <h1 className="text-3xl font-semibold tracking-tight text-lifeos-text">
          LifeOS
        </h1>

        <p className="mt-2 text-sm text-lifeos-muted">
          Personal Operating System
        </p>

        </div>

        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lifeos-border bg-lifeos-surface text-lifeos-text-secondary transition hover:border-lifeos-accent/40 hover:text-lifeos-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lifeos-accent lg:hidden"
        >
          <FaXmark />
        </button>

      </div>

      {/* Navigation */}

      <nav className="flex-1 overflow-y-auto px-4 py-5">

        <p className="mb-5 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-lifeos-muted">
          Navigation
        </p>

        <div className="space-y-2">

          {menuItems.map((item) => {
            const active =
              currentPage === item.id;

            return (
              <button
                key={item.id}
                aria-current={active ? "page" : undefined}
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
                      ? "border border-lifeos-accent/20 bg-lifeos-accent/10 text-lifeos-accent "
                      : "border border-transparent text-lifeos-text-secondary hover:border-lifeos-border hover:bg-lifeos-surface hover:text-lifeos-text"
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
                        : "group-hover:translate-x-0.5"
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
        className="mx-5 rounded-2xl border border-lifeos-accent/20 bg-lifeos-accent/5 p-5 text-left transition hover:border-lifeos-accent/40 hover:bg-lifeos-accent/10"
      >

        <p className="text-xs uppercase tracking-[0.12em] text-lifeos-accent">
          ATLAS
        </p>

        <h3 className="mt-3 font-semibold text-lifeos-text">
          Intelligence
        </h3>

        <p className="mt-1 text-sm text-lifeos-text-secondary">
          Open Intelligence
        </p>

      </button>

      {/* Profile */}

      <div className="border-t border-lifeos-border px-6 py-6">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lifeos-selected text-lifeos-accent font-bold">
            NA
          </div>

          <div>

            <h3 className="font-semibold text-lifeos-text">
              Nihal Arfain Ahmed
            </h3>

            <p className="text-sm text-lifeos-text-secondary">
              Builder Mode
            </p>

          </div>

        </div>

      </div>

    </aside>
    </>
  );
}
