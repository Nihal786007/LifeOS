import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../src/components/AppShell';
import DailyCommandCenter from '../src/dashboard/DailyCommandCenter';
import Planning from '../src/pages/Planning';
import Tasks from '../src/pages/Tasks';
import Habits from '../src/pages/Habits';
import FocusMode from '../src/focus/FocusMode';
import { useDemoFocusSession } from './useDemoFocusSession';
import CaptureFab from '../src/components/capture/CaptureFab';
import { useTheme } from '../src/theme/themeContext';
import { AtlasAIOrchestrator } from '../src/atlas/orchestration/AtlasAIOrchestrator';
import { createDemoSnapshot } from './fixtures';
import { createDemoRepositories } from './repository';
import { DemoScopeProvider } from './DemoScope';
import DemoDomainProviders from './DemoDomainProviders';

function currentFocus(controller: ReturnType<typeof useDemoFocusSession>) { return Boolean(controller.session || controller.outcome); }

export default function DemoApplication() {
  const [seed] = useState(createDemoSnapshot);
  const [repositories] = useState(() => createDemoRepositories(seed));
  return <DemoDomainProviders repositories={repositories}><DemoWorkspace seed={seed} /></DemoDomainProviders>;
}

function DemoWorkspace({seed}: {seed: ReturnType<typeof createDemoSnapshot>}) {
  const mainContentRef = useRef<HTMLElement>(null);
  const controller = useDemoFocusSession();
  const showFocus = currentFocus(controller);
  const [requestedTask, setRequestedTask] = useState<number | undefined>();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [message, setMessage] = useState('Real LifeOS engines, memory-only data. Reload resets all changes. Quick Capture and the account-only Focus History explorer are unavailable.');
  const { preference, setPreference } = useTheme();
  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentPage]);
  const orchestrator = useMemo(() => new AtlasAIOrchestrator({
    descriptor: { id: 'demo-unavailable', displayName: 'No AI provider connected', kind: 'local' },
    reason: async () => { throw new Error('AI requests are unavailable in this demonstration.'); },
  }), []);
  function unavailable(feature: string) {
    setMessage(`${feature} is outside this demonstration. No action was performed.`);
  }
  function navigate(page: string) {
    setNavigationOpen(false);
    if (['dashboard', 'planning', 'tasks', 'habits', 'focus'].includes(page)) setCurrentPage(page);
    else unavailable(page === 'atlas' ? 'Ask ATLAS' : page.charAt(0).toUpperCase() + page.slice(1));
  }
  function openFocus(taskId?: number) { setRequestedTask(taskId); setCurrentPage('focus'); }
  return <DemoScopeProvider value={{ snapshot: seed, unavailable }}>
    <div className="flex h-dvh flex-col overflow-hidden bg-lifeos-app text-lifeos-text">
      <aside aria-label="Synthetic demonstration notice" className="shrink-0 border-b border-lifeos-border bg-lifeos-surface-secondary px-3 py-2 text-xs sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p><strong>Synthetic demo</strong> · Actual LifeOS · Dashboard, Planning, Tasks, Focus & Habits · No account or backend connection</p>
          <label className="flex items-center gap-2">Appearance <select aria-label="Demo appearance" value={preference} onChange={event => setPreference(event.target.value as 'light' | 'dark' | 'system')} className="min-h-11 rounded-lg border border-lifeos-border bg-lifeos-surface px-2 text-lifeos-text"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label>
        </div>
        <p role="status" aria-live="polite" className="mt-1 text-lifeos-muted">{message}</p>
      </aside>
      <div className={currentPage === 'focus' || showFocus ? "min-h-0 flex-1 overflow-y-auto" : "min-h-0 flex-1"}>
        {(currentPage === 'focus' || showFocus) ? <FocusMode orchestrator={orchestrator} controller={controller} initialTaskId={requestedTask} onContinue={() => setCurrentPage('focus')} onExit={() => setCurrentPage('dashboard')} /> : <AppShell currentPage={currentPage} setCurrentPage={navigate} navigationOpen={navigationOpen} setNavigationOpen={setNavigationOpen} mainContentRef={mainContentRef} floatingControls={<CaptureFab onClick={() => unavailable('Quick Capture')} />}>
          {currentPage === 'dashboard' && <DailyCommandCenter orchestrator={orchestrator} onNavigate={navigate} onOpenCapture={() => unavailable('Quick Capture')} onStartFocus={openFocus} />}
          {currentPage === 'planning' && <Planning onNavigate={navigate} />}
          {currentPage === 'tasks' && <Tasks />}
          {currentPage === 'habits' && <Habits />}
        </AppShell>}
      </div>
    </div>
  </DemoScopeProvider>;
}
