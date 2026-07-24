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

  // Users
  getUsers: (params?: string) => request(`/users${params ? `?${params}` : ''}`),
  createUser: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),

  // Locations
  getLocations: (params?: string) => request(`/locations${params ? `?${params}` : ''}`),
  createLocation: (data: any) => request('/locations', { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: any) => request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id: string) => request(`/locations/${id}`, { method: 'DELETE' }),

  // Products
  getProducts: (params?: string) => request(`/products${params ? `?${params}` : ''}`),
  getCategories: () => request('/products/categories'),
  createProduct: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),
  deactivateProduct: (id: string) => request(`/products/${id}/deactivate`, { method: 'PUT' }),

  // Entries
  getEntries: (params?: string) => request(`/entries${params ? `?${params}` : ''}`),
  createEntry: (data: any) => request('/entries', { method: 'POST', body: JSON.stringify(data) }),

  // Transfers
  getTransfers: (params?: string) => request(`/transfers${params ? `?${params}` : ''}`),
  getAvailableProducts: (originId: string) => request(`/transfers/available-products?originId=${originId}`),
  checkStock: (productId: string, locationId: string) =>
    request(`/transfers/stock-check?productId=${productId}&locationId=${locationId}`),
  createTransfer: (data: any) => request('/transfers', { method: 'POST', body: JSON.stringify(data) }),

  // Stock
  getStock: (params?: string) => request(`/stock${params ? `?${params}` : ''}`),
  adjustStock: (data: any) => request('/stock/adjust', { method: 'POST', body: JSON.stringify(data) }),
  getLowStock: () => request('/stock/low-stock'),

  // Reports
  getReport: (type: string, params?: string) => request(`/reports/${type}${params ? `?${params}` : ''}`),

  // Audit
  getAuditLogs: (params?: string) => request(`/audit${params ? `?${params}` : ''}`),

  // Dashboard
  getDashboard: () => request('/dashboard'),
};
