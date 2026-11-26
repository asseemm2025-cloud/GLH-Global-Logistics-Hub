import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.basename(process.cwd())==='server'?path.resolve(process.cwd(),'..'):process.cwd();
test('local compose starts both PostgreSQL and GLH web app',()=>{
 const y=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
 assert.match(y,/^  db:/m); assert.match(y,/^  app:/m);
 assert.match(y,/condition: service_healthy/); assert.match(y,/4000:4000/);
});
test('local launch instructions warn against content URI and provide HTTP URL',()=>{
 const d=fs.readFileSync(path.join(root,'docs/LOCAL_TESTING_0.6.11_AR.md'),'utf8');
 assert.match(d,/content:\/\//); assert.match(d,/http:\/\/localhost:4000/);
 assert.match(d,/api\/ready/);
});
