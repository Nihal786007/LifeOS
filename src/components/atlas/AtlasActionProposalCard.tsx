import { FaCircleCheck, FaShieldHalved, FaXmark } from "react-icons/fa6";
import type {
  AtlasActionExecutionResult,
  AtlasActionProposal,
} from "../../atlas/actions/types";

interface Props {
  proposal: AtlasActionProposal | null;
  result: AtlasActionExecutionResult | null;
  executing: boolean;
  onApprove(): void;
  onCancel(): void;
  onDismissResult(): void;
}

function details(proposal: AtlasActionProposal): readonly string[] {
  switch (proposal.type) {
    case "task.create":
      return [`Title: ${proposal.payload.title}`, `Priority: ${proposal.payload.priority ?? "medium"}`, `Due: ${proposal.payload.dueDate ?? "not set"}`];
    case "task.update":
      return [`Task ID: ${proposal.payload.taskId}`, ...Object.entries(proposal.payload).filter(([key]) => key !== "taskId").map(([key, value]) => `${key}: ${String(value)}`)];
    case "task.complete":
      return [`Task ID: ${proposal.payload.taskId}`, "Change: mark complete"];
    case "habit.create":
      return [`Name: ${proposal.payload.name}`, `Schedule: ${proposal.payload.activeDays.join(", ")}`];
    case "habit.update":
      return [`Habit ID: ${proposal.payload.habitId}`, ...Object.entries(proposal.payload).filter(([key]) => key !== "habitId").map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)];
    case "capture.create":
      return [`Capture: ${proposal.payload.text}`];
    case "planning.weekly_focus.create":
      return [`Title: ${proposal.payload.title}`, `Monthly Outcome ID: ${proposal.payload.monthlyTargetId}`, `Dates: ${proposal.payload.weekStartDate} to ${proposal.payload.weekEndDate}`];
    case "planning.task.schedule":
      return [`Task ID: ${proposal.payload.taskId}`, `Due: ${proposal.payload.dueDate}`, ...(proposal.payload.weeklyTargetId === undefined ? [] : [`Weekly Focus ID: ${proposal.payload.weeklyTargetId ?? "none"}`])];
  }
}

export default function AtlasActionProposalCard({
  proposal,
  result,
  executing,
  onApprove,
  onCancel,
  onDismissResult,
}: Props) {
  if (result) {
    const executed = result.status === "executed";
    return (
      <div className={`rounded-2xl border p-5 ${executed ? "border-emerald-400/20 bg-emerald-400/[0.04]" : "border-slate-700 bg-slate-950/50"}`}>
        <div className="flex items-start gap-3">
          {executed ? <FaCircleCheck className="mt-1 text-emerald-300" /> : <FaXmark className="mt-1 text-slate-400" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-100">
              {executed ? "Approved action completed" : result.status === "failed" ? "Action could not be completed" : "Action not applied"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {result.status === "rejected" ? result.reason : result.status === "failed" ? result.safeError : "LifeOS applied this through its trusted mutation boundary."}
            </p>
          </div>
          <button type="button" onClick={onDismissResult} className="text-xs font-semibold text-cyan-300">Dismiss</button>
        </div>
      </div>
    );
  }

  if (!proposal) return null;
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
      <div className="flex items-start gap-3">
        <FaShieldHalved className="mt-1 text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Approval required</p>
          <h3 className="mt-2 font-bold text-white">{proposal.title}</h3>
          {proposal.rationale && <p className="mt-2 text-xs leading-5 text-slate-400">{proposal.rationale}</p>}
          <ul className="mt-3 space-y-1 text-xs text-slate-300">
            {details(proposal).map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">Nothing changes until you explicitly approve.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={executing} onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300">Cancel</button>
            <button type="button" disabled={executing} onClick={onApprove} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">
              {executing ? "Applying…" : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
