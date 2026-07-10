type SidebarProps = {
  currentPage: string;
  setCurrentPage: (page: string) => void;
};

function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "🏠 Dashboard" },
    { id: "monthly", label: "📅 Monthly" },
    { id: "tasks", label: "✅ Tasks" },
    { id: "statistics", label: "📊 Statistics" },
    { id: "habits", label: "🔥 Habits" },
    { id: "settings", label: "⚙️ Settings" },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900">
      {/* Logo */}
      <div className="border-b border-slate-800 p-6">
        <h1 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-3xl font-extrabold tracking-wide text-transparent">
          LifeOS
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Version 1.0
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`mb-2 w-full rounded-xl px-4 py-3 text-left transition-all duration-200 ${
              currentPage === item.id
                ? "bg-blue-600 text-white shadow-lg"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <p className="text-sm text-slate-400">
          Made by
        </p>

        <p className="font-semibold text-white">
          Nihal
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;