import { useDemoScope } from './scopeContext';
import type { AuthState } from '../src/auth/types';
import type { GoogleCalendarConnection, GoogleCalendarReadModel } from '../src/connectors/googleCalendar/types';

export function useAtlasCanonicalState() { return useDemoScope().snapshot; }
export function usePlanningExecution() {
  const { unavailable } = useDemoScope();
  return { completeTask: () => unavailable('Task completion'), uncompleteTask: () => unavailable('Task completion') };
}
export function useHabitExecution() {
  const { unavailable } = useDemoScope();
  return { toggleHabit: () => unavailable('Habit completion') };
}
export function useApp() {
  const { snapshot, unavailable } = useDemoScope();
  return { captures: snapshot.captures, profile: snapshot.profile,
    capturePersistence: { phase: 'hydrated' as const, error: null },
    addCapture: async () => { unavailable('Focus Quick Capture'); throw new Error('Capture is not integrated in this demo.'); },
    deleteCapture: async () => { throw new Error('Capture deletion is unavailable in this proof.'); } };
}
// Anonymous stays anonymous. Never invent a session or an authenticated owner.
export function useAuth(): AuthState {
  return { phase: 'signed-out', identity: null, error: null };
}
export function useAccountData() {
  return { phase: 'signed-out' as const, ownerUserId: null, services: null, syncStatus: null };
}
export function useGoogleCalendar() {
  const connection: GoogleCalendarConnection = { state: 'disconnected' };
  const readModel: GoogleCalendarReadModel = { calendars: [], events: [], fetchedAt: null, windowStart: null, windowEnd: null };
  return { connection, readModel };
}
