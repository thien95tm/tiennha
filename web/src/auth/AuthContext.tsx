import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { tokenStorage } from '../api/client';
import { login as apiLogin, me } from '../api/endpoints';

interface User { id: number; username: string }
interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStorage.get()) { setLoading(false); return; }
    me().then(setUser).catch(() => tokenStorage.clear()).finally(() => setLoading(false));
  }, []);

  const login = async (u: string, p: string) => {
    const r = await apiLogin(u, p);
    tokenStorage.set(r.token);
    setUser(r.user);
  };
  const logout = () => { tokenStorage.clear(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
