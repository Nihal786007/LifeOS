import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { containsCredentialFormat, containsBundleExposure } from './ci/security-check.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const output = join(root, 'dist-real-app-demo');
const manifest = JSON.parse(readFileSync(join(output, 'component-manifest.json'), 'utf8'));
assert.equal(manifest.authenticated, false);
for (const component of ['src/components/AppShell.tsx', 'src/components/Sidebar.tsx', 'src/dashboard/DailyCommandCenter.tsx', 'src/components/capture/RecentCaptures.tsx', 'src/components/capture/CaptureFab.tsx', 'src/theme/ThemeProvider.tsx', 'src/atlas/orchestration/AtlasAIOrchestrator.ts', 'src/pages/Planning.tsx', 'src/pages/Tasks.tsx', 'src/components/planning/LifeGoalPlanner.tsx', 'src/components/planning/PersonalPlanner.tsx', 'src/components/planning/PlanningSummary.tsx', 'src/components/tasks/UniversalTaskTable.tsx', 'src/context/TaskContext.tsx', 'src/context/PlanningStateContext.tsx', 'src/context/PlanningExecutionContext.tsx', 'src/engines/ExecutionCoordinator.ts', 'src/engines/PlanningMutationEngine.ts', 'src/engines/XPAutomationEngine.ts', 'src/services/ExecutionHistoryService.ts', 'src/pages/Habits.tsx', 'src/components/habits/MonthlyHabitCalendar.tsx', 'src/context/HabitExecutionContext.tsx', 'src/engines/HabitExecutionEngine.ts', 'src/engines/HabitMutationEngine.ts', 'src/focus/FocusMode.tsx', 'src/focus/focusSession.ts', 'src/focus/focusAudit.ts']) {
  assert.ok(manifest.components.includes(component), `Actual component missing: ${component}`);
}
// Windows aliases must resolve to the same context module as direct imports.
assert.equal(manifest.components.filter(path => path === 'real-app-demo/servicesContext.ts').length, 1);
for (const component of manifest.components) {
  assert.ok(!/^src\/(auth\/|data\/(cloud|database|account)\/|atlas\/providers\/|providers\/)/.test(component), `Live service included: ${component}`);
}
let files = 0;
for (const path of walk(output)) {
  assert.ok(!/\.(?:pem|key|pfx|p12|wasm|map)$/.test(path));
  if (!/\.(js|css|html|json)$/.test(path)) continue;
  const value = readFileSync(path, 'utf8'); files++;
  assert.equal(containsBundleExposure(value), false, 'Credential/private marker in demo output');
  assert.ok(!/https?:\/\/[^\s"'<>]*(?:supabase\.(?:co|com)|powersync\.(?:com|journeyapps\.com))/.test(value), 'Live endpoint in output');
  assert.ok(!value.includes('demo-network-proof'), 'Verification observer remains in normal build');
}
const html = readFileSync(join(output, 'index.html'), 'utf8');
assert.ok(html.includes("connect-src 'none'"));
const headers = readFileSync(join(output, '_headers'), 'utf8').replaceAll('\r\n', '\n');
assert.ok(headers.includes("connect-src 'none'") && headers.includes("frame-ancestors 'none'"));
assert.ok(headers.includes('/assets/*\n  Cache-Control: public, max-age=31536000, immutable'));
assert.equal(containsBundleExposure(headers), false);
assert.ok(!existsSync(join(output, '_worker.js')) && !existsSync(join(output, 'functions')));
for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) assert.ok(existsSync(join(output, match[1])), 'Missing asset');
for (const path of [...walk(join(root, 'real-app-demo')), join(root, 'vite.real-app-demo.config.ts'), join(root, 'scripts/verify-real-app-demo.mjs'), join(root, 'src/components/AppShell.tsx'), join(root, 'docs/real-application-demo-integration-v1.md'), join(root, 'docs/real-planning-tasks-integration-v2.md'), join(root, 'docs/demo-launch-readiness-v2.1.md')]) {
  assert.equal(containsCredentialFormat(readFileSync(path, 'utf8')), false, 'Credential-shaped source content');
}
console.log(`Real-app demo isolation passed: ${files} output files; actual components present; no live auth/provider/database modules, backend endpoints, credential patterns or verification observer.`);
