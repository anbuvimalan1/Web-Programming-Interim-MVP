const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const getToken = () => localStorage.getItem('token');
export const setSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken()) {
    clearSession();
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
