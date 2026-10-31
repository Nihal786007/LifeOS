import type { ReactNode } from 'react';
import { DemoScope } from './scopeContext';
import type { DemoScopeValue } from './scopeContext';
export function DemoScopeProvider({ value, children }: { value: DemoScopeValue; children: ReactNode }) {
  return <DemoScope.Provider value={value}>{children}</DemoScope.Provider>;
}
