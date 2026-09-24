import { useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBolt,
  FaCheck,
  FaCirclePause,
  FaCirclePlay,
  FaFlagCheckered,
  FaStop,
} from "react-icons/fa6";

import type { AtlasAIOrchestrator } from "../atlas/orchestration/AtlasAIOrchestrator";
import { useAtlasCanonicalState } from "../atlas/state/useAtlasCanonicalState";
import Button from "../components/ui/Button";
import { useApp } from "../context/AppContext";
import { usePlanningExecution } from "../context/PlanningExecutionContext";
import { TaskRelationshipEngine } from "../engines/TaskRelationshipEngine";
import { captureFocusThought, completeFocusedTask, FOCUS_COMPLETION_EVENT } from "./focusAudit";
import type { FocusSessionController } from "./useFocusSession";

interface FocusModeProps {
  orchestrator: AtlasAIOrchestrator;
  controller: FocusSessionController;
  initialTaskId?: number;
  onContinue(): void;
  onExit(): void;
}

function formatDuration(value: number): string {
  const totalSeconds = Math.floor(value / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export default function FocusMode({ orchestrator, controller, initialTaskId, onContinue, onExit }: FocusModeProps) {
  const state = useAtlasCanonicalState();
  const planning = usePlanningExecution();
  const { addCapture } = useApp();
  const [selectedTaskId, setSelectedTaskId] = useState<number | "">(() => initialTaskId ?? "");
  const [captureText, setCaptureText] = useState("");
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const availableTasks = useMemo(() => state.tasks.filter((task) => !task.completed), [state.tasks]);
  const activeSelection = availableTasks.some((task) => task.id === selectedTaskId) ? selectedTaskId : "";
  const relationship = useMemo(() => controller.task ? TaskRelationshipEngine.resolve({
    tasks: [...state.tasks],
    lifeGoals: [...state.lifeGoals],
    monthlyTargets: [...state.monthlyTargets],
    weeklyTargets: [...state.weeklyTargets],
  }, controller.task.id) : null, [controller.task, state.lifeGoals, state.monthlyTargets, state.tasks, state.weeklyTargets]);
  const priorities = useMemo(
    () => orchestrator.buildDeterministicPackage(state).intelligenceReport.priorities.rankedTasks,
    [orchestrator, state]
  );
  const nextTask = useMemo(() => priorities
    .map((priority) => state.tasks.find((task) => task.id === priority.taskId))
    .find((task) => task && !task.completed && task.id !== (controller.task?.id ?? controller.outcome?.executionRecord.entityId)),
  [controller.outcome?.executionRecord.entityId, controller.task?.id, priorities, state.tasks]);
  const focusMinutesToday = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    const duration = state.executionHistory.reduce((total, record) => {
      if (record.type !== "system" || record.metadata?.eventKind !== FOCUS_COMPLETION_EVENT) return total;
      if (new Date(record.createdAt).toLocaleDateString("en-CA") !== today) return total;
      return total + (typeof record.metadata.durationMs === "number" ? record.metadata.durationMs : 0);
    }, 0);
    return Math.round(duration / 60_000);
  }, [state.executionHistory]);
  const tasksCompletedToday = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return state.tasks.filter((task) => task.completedAt && new Date(task.completedAt).toLocaleDateString("en-CA") === today).length;
  }, [state.tasks]);

  async function submitCapture() {
    setCaptureStatus(null);
    try {
      if (await captureFocusThought(captureText, addCapture)) {
        setCaptureText("");
        setCaptureStatus("Captured without interrupting the timer.");
      }
    } catch {
      setCaptureStatus("Capture could not be saved.");
    }
  }

  if (controller.phase === "loading") {
    return <div className="flex min-h-dvh items-center justify-center bg-lifeos-app text-lifeos-muted">Restoring Focus Mode…</div>;
  }

  return (
    <main className="min-h-dvh bg-lifeos-app px-4 py-6 text-lifeos-text sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          {controller.session
            ? <div className="h-10 w-10" aria-hidden="true" />
            : <button type="button" onClick={onExit} className="lifeos-icon-button" aria-label="Leave Focus Mode"><FaArrowLeft /></button>}
          <div className="text-center">
            <p className="lifeos-page-eyebrow">LifeOS</p>
            <h1 className="text-xl font-black tracking-tight">Focus Mode</h1>
          </div>
          <div className="min-w-24 text-right text-xs leading-5 text-lifeos-muted"><span className="block">{tasksCompletedToday} tasks done</span><span>{focusMinutesToday}m focused</span></div>
        </header>

        {controller.error && <p role="alert" className="mt-5 rounded-xl border border-lifeos-danger/40 bg-red-500/10 p-3 text-sm text-lifeos-danger">{controller.error}</p>}

        {!controller.session && !controller.outcome && (
          <section className="mx-auto mt-12 max-w-2xl lifeos-surface-panel p-6 sm:p-8">
            <p className="lifeos-page-eyebrow">Choose one thing</p>
            <h2 className="mt-2 text-2xl font-black">What deserves your full attention?</h2>
            {availableTasks.length === 0 ? (
              <div className="lifeos-empty-state mt-6">No active tasks are available. Create one in Tasks, then return to Focus Mode.</div>
            ) : (
              <>
                <label htmlFor="focus-task" className="mt-7 block text-sm font-semibold text-lifeos-text-secondary">Task</label>
                <select id="focus-task" value={activeSelection} onChange={(event) => setSelectedTaskId(event.target.value ? Number(event.target.value) : "")} className="mt-2 min-h-12 w-full rounded-xl border border-lifeos-border bg-lifeos-surface-secondary px-4 text-lifeos-text focus:border-lifeos-accent focus:outline-none">
                  <option value="">Select an active task</option>
                  {availableTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </select>
                <Button className="mt-5 w-full" disabled={activeSelection === ""} onClick={() => activeSelection !== "" && controller.start(activeSelection)}><FaCirclePlay /> Start Focus</Button>
              </>
            )}
          </section>
        )}

        {controller.session && controller.task && (
          <section className="mx-auto mt-10 max-w-3xl text-center">
            <p className="lifeos-page-eyebrow">{controller.session.status === "running" ? "Focused now" : "Session paused"}</p>
            <h2 className="mt-4 text-3xl font-black sm:text-5xl">{controller.task.title}</h2>
            {relationship && (relationship.weeklyTarget || relationship.monthlyTarget || relationship.lifeGoal) && (
              <p className="mt-3 text-sm text-lifeos-text-secondary">
                {[relationship.lifeGoal?.title, relationship.monthlyTarget?.title, relationship.weeklyTarget?.title].filter(Boolean).join(" → ")}
              </p>
            )}
            <p className="mt-10 font-mono text-6xl font-black tabular-nums text-lifeos-accent sm:text-8xl" aria-label={`Elapsed focus time ${formatDuration(controller.elapsedMs)}`}>{formatDuration(controller.elapsedMs)}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {controller.session.status === "running"
                ? <Button variant="secondary" onClick={controller.pause}><FaCirclePause /> Pause</Button>
                : <Button onClick={controller.resume}><FaCirclePlay /> Resume</Button>}
              <Button variant="danger" onClick={() => setConfirmEnd(true)}><FaStop /> End Session</Button>
            </div>

            <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-lifeos-border bg-lifeos-surface p-5 text-left">
              <div className="flex items-center gap-2"><FaBolt className="text-lifeos-accent" /><h3 className="font-bold">Quick Capture</h3></div>
              <p className="mt-1 text-xs text-lifeos-muted">Save a thought without changing this session.</p>
              <textarea value={captureText} onChange={(event) => setCaptureText(event.target.value)} rows={2} placeholder="What should you remember later?" className="mt-4 w-full resize-none rounded-xl border border-lifeos-border bg-lifeos-surface-secondary p-3 text-sm text-lifeos-text focus:border-lifeos-accent focus:outline-none" />
              <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-lifeos-muted" role="status">{captureStatus}</span><Button variant="secondary" disabled={!captureText.trim()} onClick={() => void submitCapture()}>Capture</Button></div>
            </div>
          </section>
        )}

        {controller.outcome && (
          <section className="mx-auto mt-12 max-w-2xl lifeos-surface-panel p-6 text-center sm:p-8">
            <FaFlagCheckered className="mx-auto text-3xl text-lifeos-accent" />
            <p className="lifeos-page-eyebrow mt-4">Session recorded</p>
            <h2 className="mt-2 text-3xl font-black">{formatDuration(controller.outcome.durationMs)} focused</h2>
            <p className="mt-3 text-sm text-lifeos-text-secondary">Ending Focus Mode kept the task open and recorded one zero-XP audit event.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => { completeFocusedTask(controller.outcome!.executionRecord.entityId, planning.completeTask); controller.clearOutcome(); onExit(); }}><FaCheck /> Complete Task</Button>
              <Button variant="secondary" onClick={() => { controller.clearOutcome(); onExit(); }}>Keep Task Open</Button>
            </div>
            {nextTask && <button type="button" onClick={() => { onContinue(); setSelectedTaskId(nextTask.id); controller.clearOutcome(); }} className="mt-6 text-sm font-semibold text-lifeos-accent hover:underline">Next suggested task: {nextTask.title}</button>}
          </section>
        )}
      </div>

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setConfirmEnd(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="focus-end-title" className="w-full max-w-md rounded-2xl border border-lifeos-border bg-lifeos-surface p-6 shadow-2xl">
            <h2 id="focus-end-title" className="text-xl font-black">End this focus session?</h2>
            <p className="mt-2 text-sm text-lifeos-text-secondary">The elapsed time will be recorded with 0 XP. Your task will stay open unless you explicitly complete it afterward.</p>
            <div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => setConfirmEnd(false)}>Continue focusing</Button><Button variant="danger" onClick={() => { setConfirmEnd(false); void controller.end(); }}>End Session</Button></div>
          </div>
        </div>
      )}
    </main>
  );
}
