interface AtlasGreetingProps {
  greeting: string;
  motivation: string;
}

export default function AtlasGreeting({
  greeting,
  motivation,
}: AtlasGreetingProps) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
      <h1 className="text-4xl font-bold text-white">
        👋 {greeting}
      </h1>

      <p className="mt-3 text-slate-300 text-lg">
        {motivation}
      </p>
    </div>
  );
}