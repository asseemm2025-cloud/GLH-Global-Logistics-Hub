import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
test('community page uses unique section and content IDs',()=>{
 const html=fs.readFileSync(path.join(root,'web/community.html'),'utf8');
 for(const id of ['methodsSection','methodsList','campaignsSection','campaignsList']) assert.ok(html.includes(`id="${id}"`));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size,'duplicate DOM id found');
});
test('client portals include versioned GLHApi bridge and fallback loader',()=>{
 for(const file of ['community.html','marketplace.html','merchant.html']){
  const html=fs.readFileSync(path.join(root,'web',file),'utf8');
  assert.ok(html.includes('/glh-api.js'));
  assert.ok(html.includes('async function ensureApi()'));
 }
});
test('service worker cache version invalidates previous client shell',()=>{
 const sw=fs.readFileSync(path.join(root,'web/sw.js'),'utf8');
 assert.match(sw,/glh-shell-v\d+/);
 assert.ok(sw.includes('/glh-api.js'));
});
