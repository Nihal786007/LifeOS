import { FaCheckCircle } from "react-icons/fa";

import Card from "../ui/Card";

export default function EmptyState() {
  return (
    <Card className="border-dashed border-slate-700 bg-slate-900/50 p-14 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/10">
        <FaCheckCircle className="text-4xl text-cyan-400" />
      </div>

      <h2 className="mt-6 text-3xl font-bold">
        All Missions Complete
      </h2>

      <p className="mt-4 text-slate-400">
        Great work! There are no active missions right now.
      </p>
    </Card>
  );
}