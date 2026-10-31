import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const normalize = (path: string) => path.replaceAll('\\', '/').replace(/\.tsx?$/, '');
const bindings = new Set([
  'src/context/AppContext',
  'src/auth/AuthContext',
  'src/data/account/AccountDataContext',
  'src/connectors/googleCalendar/GoogleCalendarContext',
].map(path => normalize(resolve(root, path))));

export default defineConfig(({ mode }) => ({
  root: resolve(root, 'real-app-demo'),
  envDir: false,
  plugins: [
    {
      name: 'isolated-dashboard-bindings',
      enforce: 'pre',
      resolveId(source, importer) {
        if (importer && source.startsWith('.') && normalize(resolve(dirname(importer), source)) === normalize(resolve(root, 'src/data/DataServicesContext'))) {
          return resolve(root, 'real-app-demo/servicesContext.ts').replaceAll('\\', '/');
        }
        if (importer && source.startsWith('.') && bindings.has(normalize(resolve(dirname(importer), source)))) {
          return resolve(root, 'real-app-demo/bindings.ts').replaceAll('\\', '/');
        }
        return null;
      },
    },
    react(), tailwindcss(),
    {
      name: 'verification-only-resource-observer',
      transform(code, id) {
        if (mode !== 'verification' || !id.replaceAll('\\', '/').endsWith('/real-app-demo/main.tsx')) return null;
        // Read-only browser evidence, deliberately absent from the normal build.
        return code + `\nconst resourceEvidence = document.createElement('output');
resourceEvidence.id = 'demo-network-proof'; resourceEvidence.hidden = true;
document.body.append(resourceEvidence);
const publishResources = () => { resourceEvidence.textContent = JSON.stringify({
  navigation: location.origin,
  resources: performance.getEntriesByType('resource').map(entry => ({
    origin: new URL(entry.name).origin, path: new URL(entry.name).pathname,
    type: entry.initiatorType
  }))
}); };
new PerformanceObserver(publishResources).observe({type:'resource', buffered:true});
document.addEventListener('securitypolicyviolation', () => { resourceEvidence.dataset.violation = 'true'; });
publishResources();\n`;
      },
    },
    {
      name: 'reject-live-services',
      generateBundle() {
        const modules = [...this.getModuleIds()].map(id => id.replaceAll('\\', '/'));
        const forbidden = /\/(?:src\/(?:auth|data\/(?:cloud|database|account)|providers|atlas\/providers)|node_modules\/(?:@supabase|@powersync))\//;
        if (modules.some(id => forbidden.test(id))) this.error('Live authentication, persistence or AI implementation entered the demo.');
        // The actual Dashboard imports its date mapper, which imports the pure DTO
        // validators. None of these three modules owns a transport or credentials.
        if (modules.some(id => /\/src\/connectors\/googleCalendar\/(?!(?:mapping|types|disconnectOutcome)\.)/.test(id))) this.error('A live Calendar implementation entered the demo.');
        const paths = modules.filter(id => id.startsWith(root.replaceAll('\\', '/')) && !id.includes('/node_modules/')).map(id => id.slice(root.length));
        this.emitFile({ type: 'asset', fileName: 'component-manifest.json', source: JSON.stringify({ synthetic: true, authenticated: false, components: paths }, null, 2) });
      },
    },
  ],
  server: { host: '127.0.0.1', port: 5190, strictPort: true },
  preview: { host: '127.0.0.1', port: 5190, strictPort: true },
  build: { outDir: '../dist-real-app-demo', emptyOutDir: true },
}));
