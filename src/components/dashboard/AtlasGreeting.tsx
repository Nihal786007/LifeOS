interface AtlasGreetingProps {
  greeting: string;
  motivation: string;
}

export default function AtlasGreeting({
  greeting,
  motivation,
}: AtlasGreetingProps) {
  return (
    <div className="rounded-3xl border border-lifeos-border bg-lifeos-surface p-8 shadow-xl">
      <h1 className="text-4xl font-bold text-lifeos-text">
        👋 {greeting}
      </h1>

      <p className="mt-3 text-lifeos-text-secondary text-lg">
        {motivation}
      </p>
    </div>
  );
}