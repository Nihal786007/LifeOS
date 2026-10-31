import { FaCircleCheck, FaShieldHalved, FaTriangleExclamation, FaXmark } from "react-icons/fa6";
import type {
  AtlasActionExecutionResult,
  AtlasActionProposal,
} from "../../atlas/actions/types";
import { getConnectorCapabilityForAction } from "../../atlas/connectors/registry";
import { atlasOutcomeMessage } from "../../atlas/actions/actionOutcome";

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
    case "calendar.read":
      return ["Service: Calendar", "Action: Read events", `Date: ${proposal.payload.date ?? "current view"}`];
    case "calendar.event.create":
      return ["Service: Calendar", "Action: Create event", `Title: ${proposal.payload.title}`, `Date: ${proposal.payload.date}`, ...(proposal.payload.startTime ? [`Time: ${proposal.payload.startTime}${proposal.payload.endTime ? `–${proposal.payload.endTime}` : ""}`] : [])];
    case "messaging.message.prepare":
      return ["Service: Messaging", "Action: Prepare draft", `Recipient: ${proposal.payload.recipient}`, `Message: “${proposal.payload.content}”`];
    case "messaging.message.send":
      return ["Service: Mock Messaging", "Action: Simulate message delivery", `Recipient: ${proposal.payload.recipient}`, `Message: “${proposal.payload.content}”`];
    case "finance.balance.read":
      return ["Service: Finance", "Action: Read balance", ...(proposal.payload.accountLabel ? [`Account: ${proposal.payload.accountLabel}`] : [])];
    case "finance.transactions.read":
      return ["Service: Finance", "Action: Read recent transactions", `Limit: ${proposal.payload.limit ?? 10}`];
    case "finance.spending.summary":
      return ["Service: Finance", "Action: Read spending summary", `Period: ${proposal.payload.period}`];
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
    const outcomeMessage = result.outcome ? atlasOutcomeMessage(result.outcome) : null;
    const attention = result.status === "unknown" ||
      (result.outcome?.operation.status === "succeeded" && result.outcome.audit.status !== "confirmed");
    const mockConnector = proposal && getConnectorCapabilityForAction(proposal.type);
    return (
      <div className={`rounded-2xl border p-5 ${attention ? "border-lifeos-warning/20 bg-lifeos-warning/[0.04]" : executed ? "border-lifeos-success/20 bg-lifeos-success/[0.04]" : "border-lifeos-border bg-lifeos-app/50"}`}>
        <div className="flex items-start gap-3">
          {attention ? <FaTriangleExclamation className="mt-1 text-lifeos-warning" /> : executed ? <FaCircleCheck className="mt-1 text-lifeos-success" /> : <FaXmark className="mt-1 text-lifeos-text-secondary" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lifeos-text">
              {outcomeMessage ? mockConnector && executed ? `Mock simulation · ${outcomeMessage.title}` : outcomeMessage.title : executed ? mockConnector ? "Mock connector simulation completed" : "Approved action completed" : result.status === "unknown" ? "Action outcome unknown" : result.status === "failed" ? "Action could not be completed" : "Action not applied"}
            </p>
            <p className="mt-1 text-xs leading-5 text-lifeos-muted">
              {outcomeMessage ? `${outcomeMessage.detail}${mockConnector ? " This is a local mock simulation; no external event or message was created or sent." : ""}` : result.status === "rejected" ? result.reason : result.status === "failed" || result.status === "unknown" ? result.safeError : mockConnector ? "No external event or message was created or sent. This was a local simulation only." : "LifeOS applied this through its trusted mutation boundary."}
            </p>
          </div>
          <button type="button" onClick={onDismissResult} className="text-xs font-semibold text-lifeos-accent">Dismiss</button>
        </div>
      </div>
    );
  }

  if (!proposal) return null;
  const readOnly = proposal.risk === "READ_ONLY";
  const mockConnector = Boolean(getConnectorCapabilityForAction(proposal.type));
  return (
    <div className="rounded-2xl border border-lifeos-warning/20 bg-lifeos-warning/[0.04] p-5">
      <div className="flex items-start gap-3">
        <FaShieldHalved className="mt-1 text-lifeos-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lifeos-warning">{mockConnector ? "Mock connector · simulation only" : readOnly ? "Read-only request" : "Approval required"}</p>
          <h3 className="mt-2 font-bold text-lifeos-text">{mockConnector && !proposal.title.startsWith("Simulate") ? `Simulate: ${proposal.title}` : proposal.title}</h3>
          {proposal.rationale && <p className="mt-2 text-xs leading-5 text-lifeos-text-secondary">{proposal.rationale}</p>}
          <ul className="mt-3 space-y-1 text-xs text-lifeos-text-secondary">
            {details(proposal).map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-3 text-[11px] text-lifeos-muted">{mockConnector ? "Local simulation only. No external event or message will be created or sent. Connector actions still require approval when indicated." : readOnly ? "This read-only request cannot change data." : "Nothing changes until you explicitly approve."}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={executing} onClick={onCancel} className="min-h-11 rounded-xl border border-lifeos-border bg-lifeos-surface px-4 py-2 text-sm font-semibold text-lifeos-text focus-visible:outline-2 focus-visible:outline-lifeos-focus disabled:opacity-50">Cancel</button>
            <button type="button" disabled={executing} onClick={onApprove} className="min-h-11 rounded-xl bg-lifeos-warning px-4 py-2 text-sm font-bold text-lifeos-accent-foreground focus-visible:outline-2 focus-visible:outline-lifeos-focus disabled:opacity-50">
              {executing ? "Applying…" : mockConnector ? readOnly ? "Run mock read" : "Approve simulation" : readOnly ? "Run read" : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
