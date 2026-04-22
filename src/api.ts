const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function req(method: string, path: string, body?: unknown, form?: FormData) {
  const headers: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (body && !form) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) => req('POST', '/auth/login', { username, password }),
  me: () => req('GET', '/auth/me'),

  // Dashboard
  dashboard: () => req('GET', '/dashboard'),

  // Categories
  getCategories: () => req('GET', '/categories'),
  addCategory: (d: unknown) => req('POST', '/categories', d),
  updateCategory: (id: number, d: unknown) => req('PUT', `/categories/${id}`, d),
  deleteCategory: (id: number) => req('DELETE', `/categories/${id}`),

  // Locations
  getLocations: () => req('GET', '/locations'),
  addLocation: (d: unknown) => req('POST', '/locations', d),
  updateLocation: (id: number, d: unknown) => req('PUT', `/locations/${id}`, d),
  deleteLocation: (id: number) => req('DELETE', `/locations/${id}`),

  // Items
  getItems: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params) : '';
    return req('GET', `/items${q}`);
  },
  getItem: (id: number) => req('GET', `/items/${id}`),
  addItem: (form: FormData) => req('POST', '/items', undefined, form),
  updateItem: (id: number, form: FormData) => req('PUT', `/items/${id}`, undefined, form),
  deleteItem: (id: number) => req('DELETE', `/items/${id}`),
  getQR: (id: number) => req('GET', `/items/${id}/qr`),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params) : '';
    return req('GET', `/transactions${q}`);
  },
  addTransaction: (d: unknown) => req('POST', '/transactions', d),

  // Stocktakes
  getStocktakes: () => req('GET', '/stocktakes'),
  addStocktake: (d: unknown) => req('POST', '/stocktakes', d),
  updateStocktake: (id: number, d: unknown) => req('PUT', `/stocktakes/${id}`, d),
  adjustStocktake: (id: number, entryIndexes: number[]) => req('POST', `/stocktakes/${id}/adjust`, { entryIndexes }),

  // Users
  getUsers: () => req('GET', '/users'),
  addUser: (d: unknown) => req('POST', '/users', d),
};
