import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ops = await readFile(new URL('../../web/admin-operations.html', import.meta.url), 'utf8');
const home = await readFile(new URL('../../web/index.html', import.meta.url), 'utf8');
const business = await readFile(new URL('../../web/admin-business.html', import.meta.url), 'utf8');

test('each operational workspace has its own configuration key', () => {
  for (const key of ['investors','donors','donor-programs','donor-applications','manufacturers','manufacturer-catalog','manufacturer-inquiries','donations','debt','portals','erp','resources']) {
    assert.match(ops, new RegExp(`['"]?${key.replaceAll('-', '\\-')}['"]?:\\{title:`));
  }
});

test('donor and manufacturer submenu buttons route to dedicated workspaces', () => {
  for (const key of ['donor-programs','donor-applications','manufacturer-catalog','manufacturer-inquiries']) {
    assert.ok(ops.includes(`data-mod="${key}"`), `missing navigation data-mod for ${key}`);
    assert.ok(ops.includes(`switchModule('${key}')`), `missing switchModule route for ${key}`);
  }
});

test('routing preserves direct links and browser hash navigation', () => {
  assert.match(ops, /function normalizeModule\(key\)/);
  assert.match(ops, /history\.replaceState\(null,'','#'/);
  assert.match(ops, /addEventListener\('hashchange'/);
  assert.match(home, /function renderInlineOperationalWorkspace/);
  assert.match(home, /function selectInlineOps/);
});

test('embedded operational pages use relative same-origin paths', () => {
  assert.match(ops, /src="\.\/glh-api\.js"/);
  assert.match(business, /src="\.\/admin-operations\.html\?embedded=1"/);
});
