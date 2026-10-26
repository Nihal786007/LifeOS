import { createContext, useContext } from 'react';
import type { DemoRepositories } from './repository';

// This module replaces only DataServicesContext in the isolated build.
// Production providers consume their existing repository contracts unchanged.
export const DemoServicesContext = createContext<DemoRepositories | null>(null);
export function useDataServices() {
  const services = useContext(DemoServicesContext);
  if (!services) throw new Error('Demo repositories are unavailable.');
  return services;
}
