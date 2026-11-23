import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(path.join(tmpdir(), 'folio-test-'));
const env = {...process.env, DB_PATH:path.join(temp,'test.db'), PORT:'4187', JWT_SECRET:'isolated-test-secret-not-for-deployment'};
let child, admin, librarian, member;
async function req(route, method='GET', body, token) {
  const response = await fetch('http://localhost:4187/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,body:await response.json()};
}
const login = async (email,password) => (await req('/auth/login','POST',{email,password})).body.token;
before(async()=>{
  const seed=spawnSync(process.execPath,['src/seed.js'],{cwd:serverDir,env,encoding:'utf8'});
  assert.equal(seed.status,0,seed.stderr);
  child=spawn(process.execPath,['src/index.js'],{cwd:serverDir,env,stdio:'ignore'});
  for(let i=0;i<80;i++) {try{await req('/books');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  admin=await login('admin@library.test','Admin123!');
  librarian=await login('librarian@library.test','Librarian123!');
  member=await login('member@library.test','Member123!');
  assert.ok(admin && librarian && member);
});
after(async()=>{if(child){child.kill();await new Promise(r=>child.once('exit',r));}rmSync(temp,{recursive:true,force:true});});
test('registration, login, server-side roles and logout flow',async()=>{
  assert.equal((await req('/books')).status,401);
  assert.equal((await req('/auth/register','POST',{name:'x',email:'bad',password:'short'})).status,400);
  const user=await req('/auth/register','POST',{name:'New Reader',email:'new@test.local',password:'Password123!',role:'admin'});
  assert.equal(user.status,201);assert.equal(user.body.user.role,'member');
  assert.equal((await req('/books','POST',{title:'Forbidden'},user.body.token)).status,403);
  assert.equal((await req('/auth/login','POST',{email:'admin@library.test',password:'wrong'})).status,401);
  assert.equal((await req('/auth/logout','POST',{},user.body.token)).status,200);
});
test('full author and book CRUD with SQL persistence',async()=>{
  let a=await req('/authors','POST',{name:'Demo Author',birth_year:1980,country:'Georgia'},librarian);
  assert.equal(a.status,201);const aid=a.body.id;
  assert.equal((await req('/authors/'+aid,'PUT',{name:'Edited Author',birth_year:1981,country:'Georgia'},librarian)).status,200);
  const data={title:'Demo Book',isbn:'demo-isbn',year:2020,copies_total:2,category_id:1,author_ids:[aid]};
  const b=await req('/books','POST',data,librarian);assert.equal(b.status,201);const bid=b.body.id;
  assert.equal((await req('/books/'+bid,'PUT',{...data,title:'Edited Book'},librarian)).status,200);
  assert.equal((await req('/books/'+bid,'GET',null,member)).body.title,'Edited Book');
  assert.equal((await req('/books/'+bid,'DELETE',null,librarian)).status,200);
  assert.equal((await req('/books/'+bid,'GET',null,member)).status,404);
  assert.equal((await req('/authors/'+aid,'DELETE',null,librarian)).status,200);
});
test('availability, duplicate loans and copy-count safeguards',async()=>{
  assert.equal((await req('/loans','POST',{book_id:5},member)).status,409);
  assert.equal((await req('/loans','POST',{book_id:4},member)).status,409);
  const book=(await req('/books/4','GET',null,admin)).body;
  assert.equal((await req('/books/4','PUT',{...book,copies_total:0},admin)).status,409);
  assert.equal((await req('/books/4','DELETE',null,admin)).status,409);
  assert.equal((await req('/books/4','PUT',{...book,copies_total:'2junk'},admin)).status,400);
});
test('member borrowing, own-loan privacy, returns and real date validation',async()=>{
  const loan=await req('/loans','POST',{book_id:1,user_id:4},member);assert.equal(loan.status,201);assert.equal(loan.body.user_id,3);
  const all=await req('/loans','GET',null,member);assert.ok(all.body.every(l=>l.user_id===3));
  assert.equal((await req('/loans/'+loan.body.id+'/return','PUT',{},member)).status,403);
  assert.equal((await req('/loans/'+loan.body.id,'PUT',{due_at:'2026-02-30'},admin)).status,400);
  assert.equal((await req('/loans/'+loan.body.id+'/return','PUT',{},librarian)).status,200);
  assert.equal((await req('/loans/'+loan.body.id,'DELETE',null,admin)).status,200);
});
test('deleted and demoted accounts immediately lose access',async()=>{
  const u=(await req('/auth/register','POST',{name:'Role Test',email:'role@test.local',password:'Password123!'})).body;
  assert.equal((await req('/users/'+u.user.id,'PUT',{role:'librarian'},admin)).status,200);
  const token=await login('role@test.local','Password123!');
  assert.equal((await req('/users','GET',null,token)).status,200);
  await req('/users/'+u.user.id,'PUT',{role:'member'},admin);
  assert.equal((await req('/users','GET',null,token)).status,403);
  await req('/users/'+u.user.id,'DELETE',null,admin);
  assert.equal((await req('/books','GET',null,token)).status,401);
});
