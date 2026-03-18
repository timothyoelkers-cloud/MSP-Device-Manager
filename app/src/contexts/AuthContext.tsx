import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { api } from '@/services/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { instance, inProgress, accounts } = useMsal();
  const msalAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const result = await instance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email'],
        account: accounts[0],
      });
      api.setToken(result.accessToken);
      const { user: profile } = await api.auth.me();
      setUser(profile);
    } catch {
      setUser(null);
      api.clearToken();
    } finally {
      setIsLoading(false);
    }
  }, [instance, accounts]);

  useEffect(() => {
    if (inProgress === InteractionStatus.None && accounts.length > 0) {
      loadProfile();
    } else if (inProgress === InteractionStatus.None) {
      setIsLoading(false);
    }
  }, [inProgress, accounts, loadProfile]);

  useEffect(() => {
    const handler = () => {
      setUser(null);
      api.clearToken();
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async () => {
    await instance.loginRedirect({
      scopes: ['openid', 'profile', 'email', 'offline_access'],
    });
  }, [instance]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch { /* ignore */ }
    api.clearToken();
    setUser(null);
    await instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }, [instance]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: msalAuthenticated && user !== null,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
