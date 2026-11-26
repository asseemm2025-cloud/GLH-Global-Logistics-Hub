import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

test('client portal destinations remain available but finance/community are not linked in main navigation',()=>{
 const index=fs.readFileSync(path.join(root,'web/index.html'),'utf8');
 for(const file of ['community.html','marketplace.html','merchant.html']) assert.ok(fs.existsSync(path.join(root,'web',file)),`missing ${file}`);
 assert.ok(index.includes('href="/merchant.html"'));
 assert.ok(index.includes('href="/marketplace.html"'));
 assert.ok(!index.includes('href="/community.html"'));
 assert.ok(!index.includes('بوابة العميل والتاجر'));
});
test('service worker refreshes cached shell and includes marketplace page',()=>{
 const sw=fs.readFileSync(path.join(root,'web/sw.js'),'utf8');
 assert.match(sw,/glh-shell-v\d+/);
 assert.ok(sw.includes("'/marketplace.html'"));
 assert.ok(sw.includes("e.request.mode==='navigate'"));
});
test('client hub pages link back to platform and administration',()=>{
 for(const file of ['community.html','marketplace.html','merchant.html']){
  const html=fs.readFileSync(path.join(root,'web',file),'utf8');
  assert.ok(html.includes('href="/"'));
  assert.ok(html.includes('href="/admin-business.html"'));
 }
});
