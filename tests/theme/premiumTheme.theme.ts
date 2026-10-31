import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../../src/index.css',import.meta.url),'utf8');
function palette(theme:string):Record<string,string>{
 const rule=theme==='dark'?/:root \{([\s\S]*?)\n}/:/:root\[data-theme="light"\] \{([\s\S]*?)\n}/;
 const block=css.match(rule)?.[1];assert.ok(block);
 return Object.fromEntries([...block.matchAll(/--lifeos-([\w-]+):\s*(#[0-9a-f]{6});/g)].map(m=>[m[1],m[2]]));
}
function luminance(hex:string){const c=hex.slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const theme of ['light','dark']) {
 test(theme+' readable text across primary surfaces',()=>{const p=palette(theme);for(const fg of ['text','text-secondary','muted'])for(const bg of ['app','surface','surface-secondary','elevated'])assert.ok(contrast(p[fg],p[bg])>=4.5,fg+' on '+bg);});
 test(theme+' semantic action foregrounds meet normal-text contrast',()=>{const p=palette(theme);for(const role of ['accent','success','warning','danger'])assert.ok(contrast(p[role],p[role+'-foreground'])>=4.5,role);});
 test(theme+' focus rings remain visible on app and input surfaces',()=>{const p=palette(theme);for(const bg of ['app','surface','input'])assert.ok(contrast(p.focus,p[bg])>=3,bg);});
 test(theme+' heatmap preserves four monotonic distinct intensities',()=>{const p=palette(theme);const levels=[1,2,3,4].map(n=>luminance(p['heatmap-'+n]));assert.equal(new Set(levels).size,4);for(let i=1;i<levels.length;i++)assert.ok(theme==='dark'?levels[i]>levels[i-1]:levels[i]<levels[i-1]);});
}
test('reduced motion covers transitions and animations without hiding UI',()=>{assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);assert.match(css,/animation-iteration-count: 1/);assert.match(css,/scroll-behavior: auto/);});
test('semantic chart and status colors are registered as Tailwind tokens',()=>{for(const role of ['chart-secondary','danger-foreground','heatmap-1','heatmap-4'])assert.ok(css.includes('--color-lifeos-'+role+': var(--lifeos-'+role+')'));});
