import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../../shared/portfolio";
import { authApi } from "./api";
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}>({ user: null, loading: true, setUser: () => {}, logout: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    authApi
      .session()
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        logout: async () => {
          await authApi.logout();
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
