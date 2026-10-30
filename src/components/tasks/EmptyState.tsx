import { FaCheckCircle } from "react-icons/fa";

import Card from "../ui/Card";

export default function EmptyState() {
  return (
    <Card className="border-dashed border-lifeos-border bg-lifeos-surface/50 p-14 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lifeos-accent/10">
        <FaCheckCircle className="text-4xl text-lifeos-accent" />
      </div>

      <h2 className="mt-6 text-3xl font-bold">
        All Missions Complete
      </h2>

      <p className="mt-4 text-lifeos-text-secondary">
        Great work! There are no active missions right now.
      </p>
    </Card>
  );
}