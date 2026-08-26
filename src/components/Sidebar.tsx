import {
  FaHouse,
  FaListCheck,
  FaCalendarDays,
  FaChartLine,
  FaFire,
  FaGear,
  FaTableList,
} from "react-icons/fa6";

type SidebarProps = {
  currentPage: string;
  setCurrentPage: (page: string) => void;
};

export default function Sidebar({
  currentPage,
  setCurrentPage,
}: SidebarProps) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <FaHouse />,
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

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-950">

      {/* Logo */}

      <div className="border-b border-slate-800 px-8 py-8">

        <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          LifeOS
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Personal Operating System
        </p>

      </div>

      {/* Navigation */}

      <nav className="flex-1 px-5 py-8">

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
                  setCurrentPage(item.id)
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

      <div className="mx-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">

        <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
          ATLAS
        </p>

        <h3 className="mt-3 font-semibold text-white">
          Mission Control
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          Focused Session
        </p>

      </div>

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
  );
}