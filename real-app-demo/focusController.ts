import type { Task } from '../src/shared/types';
import type { AsyncExecutionHistoryRepository } from '../src/data/execution/asyncExecutionHistoryRepository';
import type { FocusSessionController } from '../src/focus/useFocusSession';
import { createFocusSession, getFocusElapsedMs, pauseFocusSession, resumeFocusSession } from '../src/focus/focusSession';
import { recordFocusCompletion } from '../src/focus/focusAudit';
import { ExecutionHistoryService } from '../src/services/ExecutionHistoryService';

type View = Pick<FocusSessionController, 'phase' | 'session' | 'task' | 'elapsedMs' | 'error' | 'outcome'>;
// Anonymous presentation adapter, not an authenticated account or persistence port.
// Timing, validation and audit construction stay in the real Focus modules.
export class DemoFocusController {
  private view: View = { phase: 'ready', session: null, task: null, elapsedMs: 0, error: null, outcome: null };
  private listeners = new Set<() => void>();
  private pending: Promise<void> | null = null;
  private active = true;
  private epoch = 0;
  private tasks: readonly Task[];
  private repository: AsyncExecutionHistoryRepository;
  private now: () => number;
  private uuid: () => string;
  constructor(tasks: readonly Task[], repository: AsyncExecutionHistoryRepository,
    now: () => number = Date.now, uuid: () => string = () => crypto.randomUUID()) {
    this.tasks = tasks; this.repository = repository; this.now = now; this.uuid = uuid;
  }
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  activate = () => { this.active = true; };
  deactivate = () => { this.active = false; this.epoch++; };
  private publish(next: View) { if (!this.active) return; this.view = next; for (const listener of this.listeners) listener(); }
  setTasks = (tasks: readonly Task[]) => {
    this.tasks = tasks;
    if (!this.view.session) return;
    const task = tasks.find(row => row.id === this.view.session!.taskId && !row.completed);
    if (!task) this.publish({ ...this.view, session: null, task: null, elapsedMs: 0, error: 'The focused task is no longer active.' });
    else if (task !== this.view.task) this.publish({ ...this.view, task });
  };
  tick = () => { if (this.view.session) this.publish({ ...this.view, elapsedMs: getFocusElapsedMs(this.view.session, this.now()) }); };
  start = (taskId: number) => {
    if (!this.active || this.view.session || this.pending) return;
    const task = this.tasks.find(row => row.id === taskId && !row.completed);
    if (!task) { this.publish({ ...this.view, error: 'Choose an active task before starting Focus Mode.' }); return; }
    const session = createFocusSession(taskId, 'demo-memory-only', new Date(this.now()).toISOString(), this.uuid());
    this.publish({ phase: 'ready', session, task, elapsedMs: 0, error: null, outcome: null });
  };
  pause = () => {
    if (this.pending || this.view.session?.status !== 'running') return;
    const session = pauseFocusSession(this.view.session, new Date(this.now()).toISOString());
    this.publish({ ...this.view, session, elapsedMs: getFocusElapsedMs(session, this.now()) });
  };
  resume = () => {
    if (this.pending || this.view.session?.status !== 'paused') return;
    const session = resumeFocusSession(this.view.session, new Date(this.now()).toISOString());
    this.publish({ ...this.view, session, elapsedMs: getFocusElapsedMs(session, this.now()) });
  };
  end = (): Promise<void> => {
    if (this.pending) return this.pending;
    const session = this.view.session;
    if (!this.active || !session) return Promise.resolve();
    const epoch = this.epoch;
    const operation = (async () => {
      try {
        const outcome = await recordFocusCompletion(session, new Date(this.now()).toISOString(), {
          getAll: () => ExecutionHistoryService.getAll(),
          appendConfirmed: rows => ExecutionHistoryService.appendConfirmedForRepository(this.repository, rows),
          createExecutionId: () => {
            const ids = new Set(ExecutionHistoryService.getAll().map(row => row.id));
            let id = this.now(); while (ids.has(id)) id++; return id;
          },
        });
        if (this.active && this.epoch === epoch) this.publish({ ...this.view, session: null, task: null, outcome, error: null });
      } catch (error) {
        if (this.active && this.epoch === epoch) this.publish({ ...this.view, error: error instanceof Error ? error.message : 'Focus could not be recorded.' });
      }
    })();
    this.pending = operation;
    void operation.finally(() => { if (this.pending === operation) this.pending = null; });
    return operation;
  };
  clearOutcome = () => this.publish({ ...this.view, outcome: null });
}
