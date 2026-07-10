export default function MissionCard() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 h-full">

      <h2 className="text-2xl font-bold mb-4">
        🎯 Today's Mission
      </h2>

      <textarea
        placeholder="Write today's main mission..."
        className="w-full h-48 rounded-xl bg-slate-950 p-4 outline-none resize-none"
      />

      <button className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 transition">
        Save Mission
      </button>

    </div>
  );
}