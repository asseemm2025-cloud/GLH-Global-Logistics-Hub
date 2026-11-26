import test from 'node:test';
import assert from 'node:assert/strict';
import { choosePartner } from '../src/services/routing.js';

const partners = [
  { id:'bank-a', code:'BANK_A', name:'Bank A', kind:'BANK', status:'ACTIVE', isPrimaryBank:true },
  { id:'bank-b', code:'BANK_B', name:'Bank B', kind:'BANK', status:'ACTIVE', isPrimaryBank:false },
  { id:'carrier-a', code:'CARRIER_A', name:'Carrier A', kind:'CARRIER', status:'ACTIVE', isPrimaryBank:false, capabilities:['SHIPMENT_CREATE'], metadata:{feeRate:2} },
  { id:'carrier-b', code:'CARRIER_B', name:'Carrier B', kind:'CARRIER', status:'ACTIVE', isPrimaryBank:false, capabilities:['SHIPMENT_CREATE'], metadata:{feeRate:1} },
  { id:'bank-off', code:'BANK_OFF', name:'Inactive Bank', kind:'BANK', status:'SUSPENDED', isPrimaryBank:false }
];

test('selects active primary bank for primary-bank route', () => {
  assert.equal(choosePartner({ partners, rules:[{ enabled:true, operationType:'PAYOUT', mode:'PRIMARY_BANK', priority:1 }], operationType:'PAYOUT' }).id, 'bank-a');
});

test('falls back to active primary bank when preferred provider is suspended', () => {
  assert.equal(choosePartner({ partners, rules:[{ enabled:true, operationType:'PAYOUT', mode:'PREFERRED_PROVIDER', partnerId:'bank-off', priority:1 }], operationType:'PAYOUT' }).id, 'bank-a');
});

test('supports explicit active provider selection', () => {
  assert.equal(choosePartner({ partners, operationType:'PAYOUT', requestedPartnerId:'bank-b' }).id, 'bank-b');
});

test('manual rule leaves operation unassigned', () => {
  assert.equal(choosePartner({ partners, rules:[{ enabled:true, operationType:'PAYOUT', mode:'MANUAL', priority:1 }], operationType:'PAYOUT' }), null);
});

test('lowest-fee route chooses lowest configured fee', () => {
  assert.equal(choosePartner({ partners, rules:[{ enabled:true, operationType:'SHIPMENT_CREATE', mode:'LOWEST_FEE', priority:1 }], operationType:'SHIPMENT_CREATE' }).id, 'carrier-b');
});

test('rejects explicitly requested inactive partner', () => {
  assert.throws(() => choosePartner({ partners, operationType:'PAYOUT', requestedPartnerId:'bank-off' }), /REQUESTED_PARTNER_NOT_ACTIVE/);
});
