import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import DemoApplication from './DemoApplication';
import './style.css';

const appearance = new Map<string, string>();
const memoryAppearance = { getItem: (key: string) => appearance.get(key) ?? null, setItem: (key: string, value: string) => { appearance.set(key, value); } };
createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider storage={memoryAppearance}><DemoApplication /></ThemeProvider></StrictMode>);
