import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, ROLES, DEPARTMENTS, DEFAULT_GRANTS } from '../src/security/permission-catalog.js';
test('permission catalogue has unique stable keys',()=>{const keys=PERMISSIONS.map(x=>x.key);assert.ok(keys.length>=80);assert.equal(new Set(keys).size,keys.length)});
test('all default grants refer to known permissions',()=>{const keys=new Set(PERMISSIONS.map(x=>x.key));for(const grants of Object.values(DEFAULT_GRANTS))for(const key of grants)assert.ok(keys.has(key),`Unknown permission ${key}`)});
test('role catalogue contains platform, operations, finance, support and compliance roles',()=>{const roles=new Set(ROLES.map(x=>x.key));for(const role of ['ADMIN','OPS','FINANCE','SUPPORT','COMPLIANCE','MERCHANT','CLIENT'])assert.ok(roles.has(role))});
test('administrative hierarchy contains functional departments',()=>{assert.ok(DEPARTMENTS.length>=8);assert.ok(DEPARTMENTS.every(x=>x.code&&x.nameAr&&x.functions.length))});
