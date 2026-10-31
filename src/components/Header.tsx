export default function Header() {
  const today = new Date();

  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold">
          Good Afternoon, Nihal 👋
        </h1>

        <p className="mt-2 text-lifeos-text-secondary">
          {today.toDateString()}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="rounded-xl bg-lifeos-elevated px-4 py-2 outline-none focus:ring-2 focus:ring-lifeos-accent"
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lifeos-accent text-lg font-bold">
          N
        </div>
      </div>
    </header>
  );
}