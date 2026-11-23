// Centralized in-memory authentication store (no token persistence in localStorage)
let activeAuthToken = null;
let activeAuthUser = null;
const listeners = new Set();

export const authStore = {
  getToken: () => activeAuthToken,
  getUser: () => activeAuthUser,
  setAuth: (token, user) => {
    activeAuthToken = token || null;
    activeAuthUser = user || null;
    listeners.forEach((listener) => {
      try {
        listener({ token: activeAuthToken, user: activeAuthUser });
      } catch (e) {
        console.error('Error invoking auth listener', e);
      }
    });
  },
  clearAuth: () => {
    activeAuthToken = null;
    activeAuthUser = null;
    listeners.forEach((listener) => {
      try {
        listener({ token: null, user: null });
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
