import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const children=[spawn(process.execPath,['src/index.js'],{cwd:path.join(root,'server'),stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','localhost','--port','5173','--strictPort'],{cwd:path.join(root,'client'),stdio:'inherit'})];
let closing=false;
function close(code=0){if(closing)return;closing=true;children.forEach(c=>c.kill());process.exit(code);}
children.forEach(c=>{c.on('error',e=>{console.error(e.message);close(1)});c.on('exit',code=>{if(!closing)close(code||0)});});
process.on('SIGINT',()=>close());process.on('SIGTERM',()=>close());
console.log('Open http://localhost:5173 after Vite reports ready. Keep this window open.');
