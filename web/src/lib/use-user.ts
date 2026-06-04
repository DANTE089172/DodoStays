"use client";

import { useAuth } from "./auth-context";

export function useUser() {
  const { user, loading } = useAuth();
  return { user, loading, isAuthenticated: user !== null };
}
