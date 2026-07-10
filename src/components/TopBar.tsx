export default function TopBar() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-4 backdrop-blur-md shadow-lg">
      <div>
        <h1 className="text-3xl font-bold">🚀 Mission Control</h1>

        <p className="text-sm text-slate-400 mt-1">
          {today}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button className="rounded-xl bg-slate-800 px-4 py-2 hover:bg-slate-700 transition">
          🔔
        </button>

        <button className="rounded-xl bg-indigo-600 px-4 py-2 hover:bg-indigo-500 transition">
          + New Task
        </button>
      </div>
    </header>
  );
}