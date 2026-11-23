import { existsSync,writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!existsSync(path.join(root,'server/.env')))writeFileSync(path.join(root,'server/.env'),`PORT=4000\nJWT_SECRET=${randomBytes(32).toString('hex')}\nCLIENT_ORIGIN=http://localhost:5173\n`);
if(!existsSync(path.join(root,'client/.env')))writeFileSync(path.join(root,'client/.env'),'VITE_API_URL=http://localhost:4000/api\n');
if(!existsSync(path.join(root,'server/library.db'))){
  const r=spawnSync(process.execPath,['src/seed.js'],{cwd:path.join(root,'server'),stdio:'inherit'});
  if(r.status!==0)process.exit(1);
}
console.log('Configuration ready. Existing database was preserved.');
