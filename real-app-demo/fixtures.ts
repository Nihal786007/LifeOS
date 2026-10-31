import type { AtlasStateInput } from '../src/atlas/state/types';
import { buildAtlasState } from '../src/atlas/state/buildAtlasState';

export function createDemoSnapshot(now = new Date()) {
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const createdAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7).toISOString();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
  const key = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
  const source: AtlasStateInput = {
    profile: { name: 'Demo', occupation: 'Fictional student', timezone: 'Asia/Kolkata', theme: 'dark', atlasPersonality: 'Professional', level: 1, xp: 0 },
    tasks: [
      { id: 1, title: 'Test keyboard navigation on the campus map', priority: 'high', dueDate: date, weeklyTargetId: 301, completed: false, createdAt },
      { id: 2, title: 'Work through five calculus problems', priority: 'medium', dueDate: date, weeklyTargetId: 302, completed: false, createdAt },
      { id: 3, title: 'Review accessible route labels', priority: 'low', dueDate: date, weeklyTargetId: 301, completed: false, createdAt },
    ],
    lifeGoals: [
      { id: 101, title: 'Build useful, accessible software', progress: 0, completed: false, startDate: date, createdAt },
      { id: 102, title: 'Learn with intention', progress: 0, completed: false, startDate: date, createdAt },
    ],
    monthlyTargets: [
      { id: 201, goalId: 101, title: 'Build an accessible campus map', month: now.getMonth() + 1, year: now.getFullYear(), progress: 0, completed: false, createdAt },
      { id: 202, goalId: 102, title: 'Understand core calculus ideas', month: now.getMonth() + 1, year: now.getFullYear(), progress: 0, completed: false, createdAt },
    ],
    weeklyTargets: [
      { id: 301, monthlyTargetId: 201, title: 'Test the first accessible route', week: 1, weekStartDate: key(monday), weekEndDate: key(sunday), progress: 0, completed: false, createdAt },
      { id: 302, monthlyTargetId: 202, title: 'Practice derivatives', week: 1, weekStartDate: key(monday), weekEndDate: key(sunday), progress: 0, completed: false, createdAt },
    ],
    habitDefinitions: ['Read for twenty minutes', 'Take a walk'].map((name, i) => ({ id: 401 + i, name, activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], startDate: date, archived: false, createdAt, updatedAt: createdAt })),
    habitCompletions: [], executionHistory: [], captures: [],
  };
  return buildAtlasState(source, now);
}
