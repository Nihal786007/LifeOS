import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { useTasks } from '../src/context/TaskContext';
import { useDataServices } from './servicesContext';
import { DemoFocusController } from './focusController';
import type { FocusSessionController } from '../src/focus/useFocusSession';

export function useDemoFocusSession(): FocusSessionController {
  const { tasks } = useTasks();
  const { executionHistoryRepository } = useDataServices();
  const [controller] = useState(() => new DemoFocusController(tasks, executionHistoryRepository));
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { controller.activate(); return controller.deactivate; }, [controller]);
  useLayoutEffect(() => { controller.setTasks(tasks); }, [controller, tasks]);
  useEffect(() => {
    if (view.session?.status !== 'running') return;
    const timer = window.setInterval(controller.tick, 1000);
    return () => window.clearInterval(timer);
  }, [controller, view.session?.status]);
  return { ...view, start: controller.start, pause: controller.pause, resume: controller.resume, end: controller.end, clearOutcome: controller.clearOutcome };
}
