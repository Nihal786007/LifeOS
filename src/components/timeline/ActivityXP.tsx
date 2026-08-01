interface ActivityXPProps {
  xp: number;
}

export default function ActivityXP({
  xp,
}: ActivityXPProps) {
  return (
    <div
      className="
        rounded-full
        bg-cyan-500/10
        border
        border-cyan-500/20
        px-3
        py-1
        text-xs
        font-bold
        tracking-[0.2em]
        text-cyan-300
      "
    >
      +{xp} XP
    </div>
  );
}