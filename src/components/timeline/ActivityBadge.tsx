interface ActivityBadgeProps {
  status:
    | "planned"
    | "in_progress"
    | "completed"
    | "cancelled";
}

export default function ActivityBadge({
  status,
}: ActivityBadgeProps) {
  const styles = {
    planned:
      "bg-blue-500/10 text-blue-400 border-blue-500/20",

    in_progress:
      "bg-amber-500/10 text-amber-400 border-amber-500/20",

    completed:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    cancelled:
      "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const labels = {
    planned: "PLANNED",
    in_progress: "IN PROGRESS",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };

  return (
    <span
      className={`
        rounded-full
        border
        px-3
        py-1
        text-xs
        font-bold
        tracking-[0.2em]
        uppercase

        ${styles[status]}
      `}
    >
      {labels[status]}
    </span>
  );
}