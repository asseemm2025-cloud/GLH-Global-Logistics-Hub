import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
test('browser API bridge is shipped and exposes required methods', () => {
  const source = fs.readFileSync(path.join(root, 'web/glh-api.js'), 'utf8');
  for (const method of ['register(data)', 'login(username, password)', 'createOrder(data)', 'myOrders()', 'sectors()', 'partners()', 'routingPreview(data)', 'health()']) assert.ok(source.includes(method), `missing ${method}`);
});
test('Stage 5 page loads the API bridge without removing legacy UI', () => {
  const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  assert.ok(html.includes('/glh-api.js'));
  assert.ok(html.includes('adminShell'));
  assert.ok(html.includes('clientShell'));
});
