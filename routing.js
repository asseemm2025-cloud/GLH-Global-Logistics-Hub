/** Pure routing policy. This selects a provider only; it never moves money. */
export function choosePartner({ partners, rules = [], operationType, requestedPartnerId = null }) {
  const active = partners.filter(p => p.status === 'ACTIVE');
  if (requestedPartnerId) {
    const requested = active.find(p => p.id === requestedPartnerId);
    if (!requested) throw new Error('REQUESTED_PARTNER_NOT_ACTIVE');
    return requested;
  }
  const applicable = rules
    .filter(r => r.enabled && r.operationType === operationType)
    .sort((a, b) => a.priority - b.priority);
  for (const rule of applicable) {
    if (rule.mode === 'MANUAL') return null;
    if (rule.mode === 'PRIMARY_BANK') {
      const bank = active.find(p => p.kind === 'BANK' && p.isPrimaryBank);
      if (bank) return bank;
    }
    if (rule.mode === 'PREFERRED_PROVIDER' && rule.partnerId) {
      const partner = active.find(p => p.id === rule.partnerId);
      if (partner) return partner;
    }
    if (rule.mode === 'LOWEST_FEE') {
      const eligible = active.filter(p => p.capabilities?.includes?.(operationType));
      eligible.sort((a, b) => Number(a.metadata?.feeRate ?? Infinity) - Number(b.metadata?.feeRate ?? Infinity));
      if (eligible[0]) return eligible[0];
    }
  }
  // Safe default: use primary bank only if active; otherwise leave unassigned.
  return active.find(p => p.kind === 'BANK' && p.isPrimaryBank) || null;
}
