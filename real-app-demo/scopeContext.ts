import { createContext, useContext } from 'react';
import type { AtlasCanonicalState } from '../src/atlas/state/types';

export interface DemoScopeValue {
  snapshot: AtlasCanonicalState;
  unavailable(feature: string): void;
}
export const DemoScope = createContext<DemoScopeValue | null>(null);
export function useDemoScope() {
  const value = useContext(DemoScope);
  if (!value) throw new Error('Isolated demo scope is required.');
  return value;
}
