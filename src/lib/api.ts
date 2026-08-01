const API_BASE = '/api';

async function request(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('zantra_token');
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (res.status === 401) {
    // Try refresh
    const refreshToken = localStorage.getItem('zantra_refresh');
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('zantra_token', data.accessToken);
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        const retryRes = await fetch(`${API_BASE}${url}`, { ...options, headers });
        if (!retryRes.ok) throw new Error('Erro na requisição');
        return retryRes.json();
      }
    }
    localStorage.removeItem('zantra_token');
    localStorage.removeItem('zantra_refresh');
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro na requisição' }));
    throw new Error(err.error || 'Erro na requisição');
  }

  // Check if response is CSV
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('text/csv')) {
    return res.blob();
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getSessions: () => request('/auth/sessions'),
  revokeSession: (id: string) => request(`/auth/sessions/${id}`, { method: 'DELETE' }),
  changePassword: (data: any) => request('/auth/change-password', { method: 'PUT', body: JSON.stringify(data) }),

  // Users
  getUsers: (params?: string) => request(`/users${params ? `?${params}` : ''}`),
  getUserOptions: () => request('/users/options'),
  createUser: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
  getPermissionCatalog: () => request('/permissions/catalog'),
  getUserPermissions: (id: string) => request(`/permissions/users/${id}`),
  updateUserPermissions: (id: string, permissions: string[]) => request(`/permissions/users/${id}`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  resetUserPermissions: (id: string) => request(`/permissions/users/${id}`, { method: 'DELETE' }),

  // Referências mínimas usadas pelos módulos operacionais
  getReferenceProducts: () => request('/references/products'),
  getReferenceLocations: (type?: string) => request(`/references/locations${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  getReferenceUsers: () => request('/references/users'),

  // Locations
  getLocations: (params?: string) => request(`/locations${params ? `?${params}` : ''}`),
  createLocation: (data: any) => request('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: any) => request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id: string) => request(`/locations/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params?: string) => request(`/products${params ? `?${params}` : ''}`),
  getCategories: () => request('/products/categories'),
  getUnits: () => request('/products/units'),
  createProduct: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
  deactivateProduct: (id: string) => request(`/products/${id}/deactivate`, { method: 'PUT' }),

  // Entries
  getEntries: (params?: string) => request(`/entries${params ? `?${params}` : ''}`),
  createEntry: (data: any) => request('/entries', { method: 'POST', body: JSON.stringify(data) }),
  getUnassignedStock: () => request('/entries/unassigned'),
  allocateUnassignedStock: (data: any) => request('/entries/unassigned/allocate', { method: 'POST', body: JSON.stringify(data) }),
  getInventories: (params?: string) => request(`/inventories${params ? `?${params}` : ''}`),
  getInventory: (id: string) => request(`/inventories/${id}`),
  getEligibleInventoryCounters: (locationId: string) => request(`/inventories/eligible-counters/${locationId}`),
  createInventory: (data: any) => request('/inventories', { method: 'POST', body: JSON.stringify(data) }),
  countInventoryItem: (inventoryId: string, itemId: string, quantity: number) => request(`/inventories/${inventoryId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  submitInventory: (id: string) => request(`/inventories/${id}/submit`, { method: 'POST' }),
  requestInventoryRecount: (id: string, itemIds: string[], reason: string) => request(`/inventories/${id}/recount`, { method: 'POST', body: JSON.stringify({ itemIds, reason }) }),
  rejectInventory: (id: string, reason: string) => request(`/inventories/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  applyInventory: (id: string, notes?: string, itemIds?: string[]) => request(`/inventories/${id}/apply`, { method: 'POST', body: JSON.stringify({ notes, itemIds }) }),
  cancelInventory: (id: string, reason: string) => request(`/inventories/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),

  // Transfers
  getTransfers: (params?: string) => request(`/transfers${params ? `?${params}` : ''}`),
  getAvailableProducts: (originId: string) => request(`/transfers/available-products?originId=${originId}`),
  checkStock: (productId: string, locationId: string) =>
    request(`/transfers/stock-check?productId=${productId}&locationId=${locationId}`),
  createTransfer: (data: any) => request('/transfers', { method: 'POST', body: JSON.stringify(data) }),
  approveTransfer: (id: string) => request(`/transfers/${id}/approve`, { method: 'POST' }),
  rejectTransfer: (id: string, reason: string) => request(`/transfers/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  confirmTransfer: (id: string) => request(`/transfers/${id}/confirm`, { method: 'POST' }),
  reverseTransfer: (id: string, reason: string) => request(`/transfers/${id}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Stock
  getStock: (params?: string) => request(`/stock${params ? `?${params}` : ''}`),
  adjustStock: (data: any) => request('/stock/adjust', { method: 'POST', body: JSON.stringify(data) }),
  getLowStock: () => request('/stock/low-stock'),
  setStockMinimum: (data: any) => request('/stock/minimum', { method: 'PUT', body: JSON.stringify(data) }),

  // Consumption
  getConsumption: (params?: string) => request(`/consumption${params ? `?${params}` : ''}`),
  getConsumptionProducts: (locationId: string) => request(`/consumption/available-products?locationId=${encodeURIComponent(locationId)}`),
  createConsumption: (data: any) => request('/consumption', { method: 'POST', body: JSON.stringify(data) }),
  reverseConsumption: (id: string, reason: string) => request(`/consumption/${id}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Sales
  getSales: (params?: string) => request(`/sales${params ? `?${params}` : ''}`),
  getSale: (id: string) => request(`/sales/${id}`),
  getSaleProducts: (locationId: string) => request(`/sales/available-products?locationId=${encodeURIComponent(locationId)}`),
  createSale: (data: any) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),
  reverseSale: (id: string, reason: string) => request(`/sales/${id}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Reports
  getReport: (type: string, params?: string) => request(`/reports/${type}${params ? `?${params}` : ''}`),

  // Audit
  getAuditLogs: (params?: string) => request(`/audit${params ? `?${params}` : ''}`),

  // Dashboard
  getDashboard: () => request('/dashboard'),
  exportBackup: () => request('/backup/csv'),
  getSupplyRequests: (params?: string) => request(`/supplies${params ? `?${params}` : ''}`),
  createSupplyRequest: (data: any) => request('/supplies', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplyRequest: (id: string, action: string, message?: string) => request(`/supplies/${id}/status`, { method: 'POST', body: JSON.stringify({ action, message }) }),
  getPending: () => request('/pending'),
  getNotifications: () => request('/notifications'),
  readNotification: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  readAllNotifications: () => request('/notifications/read-all', { method: 'PUT' }),
  getClosings: () => request('/closings'),
  previewClosing: (params: string) => request(`/closings/preview?${params}`),
  createClosing: (data: any) => request('/closings', { method: 'POST', body: JSON.stringify(data) }),
  approveClosing: (id: string) => request(`/closings/${id}/approve`, { method: 'POST' }),
};
