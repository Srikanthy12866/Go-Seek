// Centralized in-memory authentication store (no token persistence in localStorage)
let activeAuthToken = null;
let activeRefreshToken = null;
let activeAuthUser = null;
const listeners = new Set();

const AUTH_SERVICE_URL = process.env.REACT_APP_AUTH_URL || 'http://localhost:8081';

export const authStore = {
  getToken: () => activeAuthToken,
  getRefreshToken: () => activeRefreshToken,
  getUser: () => activeAuthUser,
  setAuth: (token, user, refreshToken = null) => {
    activeAuthToken = token || null;
    activeAuthUser = user || null;
    if (refreshToken !== undefined) {
      activeRefreshToken = refreshToken || null;
    }
    listeners.forEach((listener) => {
      try {
        listener({ token: activeAuthToken, user: activeAuthUser, refreshToken: activeRefreshToken });
      } catch (e) {
        console.error('Error invoking auth listener', e);
      }
    });
  },
  refreshSession: async () => {
    if (!activeRefreshToken) return null;
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: activeRefreshToken }),
      });
      if (!res.ok) {
        authStore.clearAuth();
        return null;
      }
      const data = await res.json();
      if (data.accessToken && data.refreshToken) {
        authStore.setAuth(data.accessToken, activeAuthUser, data.refreshToken);
        return data.accessToken;
      }
      return null;
    } catch (_) {
      return null;
    }
  },
  clearAuth: () => {
    activeAuthToken = null;
    activeRefreshToken = null;
    activeAuthUser = null;
    listeners.forEach((listener) => {
      try {
        listener({ token: null, user: null, refreshToken: null });
      } catch (e) {
        console.error('Error invoking auth listener', e);
      }
    });
  },
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  isAuthenticated: () => Boolean(activeAuthToken),
};

export default authStore;
