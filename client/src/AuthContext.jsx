import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'smartcity_auth';

function saveAuth(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}
function loadAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false); // true once session restore attempted

  // Restore session on mount
  useEffect(() => {
    const stored = loadAuth();
    if (!stored?.token) { setReady(true); return; }

    // Verify token is still valid against the server
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(userData => {
        if (userData) {
          setUser({ ...userData, token: stored.token });
        } else {
          clearAuth();
        }
      })
      .catch(() => clearAuth())
      .finally(() => setReady(true));
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Login failed.' };

      const userData = { ...data.user, token: data.token };
      setUser(userData);
      saveAuth({ token: data.token, user: data.user });
      return { success: true };
    } catch {
      return { success: false, message: 'Could not connect to server. Is the server running?' };
    }
  };

  const register = async ({ email, username, password, name }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, name }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Registration failed.' };

      const userData = { ...data.user, token: data.token };
      setUser(userData);
      saveAuth({ token: data.token, user: data.user });
      return { success: true };
    } catch {
      return { success: false, message: 'Could not connect to server. Is the server running?' };
    }
  };

  const logout = () => {
    setUser(null);
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
