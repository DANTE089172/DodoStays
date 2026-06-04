"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { refreshAccessToken, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp, type SignUpInput, type User } from "./auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
}

interface AuthApi extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    refreshAccessToken().then((res) => {
      if (cancelled) return;
      if (res) {
        setAccessToken(res.accessToken);
        setUser(res.user);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiSignIn(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const res = await apiSignUp(input);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    if (accessToken) await apiSignOut(accessToken);
    setAccessToken(null);
    setUser(null);
  }, [accessToken]);

  const value = useMemo<AuthApi>(
    () => ({ user, accessToken, loading, signIn, signUp, signOut }),
    [user, accessToken, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
