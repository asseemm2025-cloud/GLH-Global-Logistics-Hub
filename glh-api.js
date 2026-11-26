/* GLH API client v0.6.6. This module is the supported browser-to-API bridge.
 * It does not store passwords; bearer tokens are kept in sessionStorage only.
 */
(function (global) {
  'use strict';
  const TOKEN_KEY = 'glh_access_token';
  const API_BASE = (global.GLH_API_BASE || '/api').replace(/\/$/, '');
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers, body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
    if (!response.ok) {
      const error = new Error(payload?.error || `HTTP ${response.status}`);
      error.status = response.status; error.payload = payload; throw error;
    }
    return payload;
  }
  const api = {
    request,
    async register(data) { return request('/auth/register', { method: 'POST', body: data }); },
    async login(username, password) {
      const result = await request('/auth/login', { method: 'POST', body: { username, password } });
      sessionStorage.setItem(TOKEN_KEY, result.token); return result;
    },
    async changePassword(currentPassword,newPassword) { return request('/auth/change-password',{method:'POST',body:{currentPassword,newPassword}}); },
    logout() { sessionStorage.removeItem(TOKEN_KEY); },
    isAuthenticated() { return Boolean(sessionStorage.getItem(TOKEN_KEY)); },
    createOrder(data) { return request('/orders', { method: 'POST', body: data }); },
    myOrders() { return request('/orders/mine'); },
    sectors() { return request('/management/sectors'); },
    partners() { return request('/partners'); },
    routingPreview(data) { return request('/partners/routing/preview', { method: 'POST', body: data }); },
    health() { return request('/health'); },
    readiness() { return request('/ready'); },
    merchantMe() { return request('/business/merchant/me'); },
    merchantConnections() { return request('/business/merchant/connections'); },
    requestMerchantConnection(data) { return request('/business/merchant/connections',{method:'POST',body:data}); },
    merchantStores(data) { return request('/business/merchant/stores',{method:'POST',body:data}); },
    merchantProducts() { return request('/business/merchant/products'); },
    submitMerchantProduct(data) { return request('/business/merchant/products',{method:'POST',body:data}); },
    merchantPortals() { return request('/business/merchant/portals'); },
    createMerchantPortal(data) { return request('/business/merchant/portals',{method:'POST',body:data}); },
    paymentMethods() { return request('/business/payment-methods'); },
    donationCampaigns() { return request('/business/donation-campaigns'); },
    submitClientServiceRequest(data) { return request('/client-requests', { method: 'POST', body: data }); },
    myClientServiceRequests() { return request('/client-requests/mine'); },
    createDonation(data) { return request('/business/donations',{method:'POST',body:data}); },
    providers(category) { return request('/business/providers'+(category?'?category='+encodeURIComponent(category):'')); },
    operationalRecords(module) { return request('/operations-hub/records?module='+encodeURIComponent(module)); },
    createOperationalRecord(moduleKey,data) { return request('/operations-hub/records',{method:'POST',body:{moduleKey,data}}); },
    updateOperationalRecord(id,data) { return request('/operations-hub/records/'+encodeURIComponent(id),{method:'PATCH',body:{data}}); },
    deleteOperationalRecord(id) { return request('/operations-hub/records/'+encodeURIComponent(id),{method:'DELETE'}); },
    submitOperationalRequest(data) { return request('/operations-hub/requests',{method:'POST',body:data}); },
    myOperationalRequests() { return request('/operations-hub/requests/mine'); },
    operationalRequests(filters={}) { const q=new URLSearchParams(filters); return request('/operations-hub/requests'+(q.toString()?'?'+q:'')); },
    updateOperationalRequest(id,data) { return request('/operations-hub/requests/'+encodeURIComponent(id),{method:'PATCH',body:data}); }
  };
  global.GLHApi = Object.freeze(api);
})(window);
