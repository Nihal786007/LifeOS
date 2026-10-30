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
        bg-lifeos-accent/10
        border
        border-lifeos-accent/20
        px-3
        py-1
        text-xs
        font-bold
        tracking-[0.12em]
        text-lifeos-accent
      "
    >
      +{xp} XP
    </div>
  );
}