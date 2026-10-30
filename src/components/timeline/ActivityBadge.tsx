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
      "bg-lifeos-accent/10 text-lifeos-accent border-lifeos-accent/20",

    in_progress:
      "bg-lifeos-warning/10 text-lifeos-warning border-lifeos-warning/20",

    completed:
      "bg-lifeos-success/10 text-lifeos-success border-lifeos-success/20",

    cancelled:
      "bg-lifeos-danger/10 text-lifeos-danger border-lifeos-danger/20",
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
        tracking-[0.12em]
        uppercase

        ${styles[status]}
      `}
    >
      {labels[status]}
    </span>
  );
}