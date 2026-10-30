export default function MissionCard() {
  return (
    <div className="rounded-2xl border border-lifeos-border bg-lifeos-surface p-6 h-full">

      <h2 className="text-2xl font-bold mb-4">
        🎯 Today's Mission
      </h2>

      <textarea
        placeholder="Write today's main mission..."
        className="w-full h-48 rounded-xl bg-lifeos-app p-4 outline-none resize-none"
      />

      <button className="mt-5 w-full rounded-xl bg-lifeos-accent py-3 font-semibold hover:bg-lifeos-accent transition">
        Save Mission
      </button>

    </div>
  );
}