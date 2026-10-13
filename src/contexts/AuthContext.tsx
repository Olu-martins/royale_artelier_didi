import React, {
  useCallback,
  useMemo,
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import api, { User } from "@/services/api";
import {
  AdminRole,
  Permission,
  hasPermission,
  resolveRole,
} from "@/lib/roles";

export interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Effective admin role, or "customer" when signed out. */
  role: AdminRole;
  /** Whether the signed-in user's role grants a permission. */
  can: (permission: Permission) => boolean;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUserData: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const userData = await api.getProfile();
          setUser(userData);
        } catch (error) {
          // Token invalid, clear it
          api.logout();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<LoginResult> => {
    try {
      const { user: userData } = await api.login(email, password);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      // Pass the server's message through: a suspended account needs to be told
      // to contact support, not shown a generic "invalid credentials".
      return {
        success: false,
        message:
          error instanceof Error && error.message
            ? error.message
            : "Invalid credentials",
      };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const { user: userData } = await api.register(name, email, password);
      setUser(userData);
      return true;
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const setUserData = (data: User | null) => {
    setUser(data);
  };

  const role = useMemo(() => resolveRole(user), [user]);
  const can = useCallback(
    (permission: Permission) => hasPermission(user, permission),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        setUserData,
        role,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export type { User };
