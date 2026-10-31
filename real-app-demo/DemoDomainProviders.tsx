import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { TaskProvider } from '../src/context/TaskContext';
import { PlanningStateProvider } from '../src/context/PlanningStateContext';
import { LifeGoalsProvider } from '../src/context/LifeGoalsContext';
import { MonthlyPlanningProvider } from '../src/context/MonthlyPlanningContext';
import { WeeklyPlanningProvider } from '../src/context/WeeklyPlanningContext';
import { HabitExecutionProvider } from '../src/context/HabitExecutionContext';
import { HabitProvider } from '../src/context/HabitContext';
import { PlanningExecutionProvider } from '../src/context/PlanningExecutionContext';
import { ExecutionHistoryService } from '../src/services/ExecutionHistoryService';
import { DemoServicesContext } from './servicesContext';
import type { DemoRepositories } from './repository';

export default function DemoDomainProviders({ repositories, children }: { repositories: DemoRepositories; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    ExecutionHistoryService.configureRepository(repositories.executionHistoryRepository);
    void ExecutionHistoryService.initialize().then(() => { if (active) setReady(true); }).catch(() => { if (active) setError('Demo history could not initialize.'); });
    return () => { active = false; ExecutionHistoryService.releaseRepository(repositories.executionHistoryRepository); };
  }, [repositories]);
  if (!ready) return <p role={error ? 'alert' : 'status'} className="p-6 text-lifeos-text-secondary">{error || 'Loading synthetic LifeOS data…'}</p>;
  return <DemoServicesContext.Provider value={repositories}>
    <TaskProvider><PlanningStateProvider><LifeGoalsProvider><MonthlyPlanningProvider><WeeklyPlanningProvider><HabitProvider><HabitExecutionProvider><PlanningExecutionProvider>
      {children}
    </PlanningExecutionProvider></HabitExecutionProvider></HabitProvider></WeeklyPlanningProvider></MonthlyPlanningProvider></LifeGoalsProvider></PlanningStateProvider></TaskProvider>
  </DemoServicesContext.Provider>;
}
