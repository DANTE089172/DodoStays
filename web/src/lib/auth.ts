import { apiFetch, buildApiUrl } from "./api-client";

export type UserRole = "Guest" | "Host" | "Admin" | "Inspector";
export type KycStatus = "NotStarted" | "Pending" | "Verified" | "Failed" | "ManualReview";

export interface User {
  id: string;
  email: string;
  displayName: string;
  preferredLanguage: string;
  role: UserRole;
  kycStatus: KycStatus;
  twoFactorEnabled: boolean;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: User;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  preferredLanguage: string;
  intendedRole: UserRole;
}

export async function signUp(input: SignUpInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/identity/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/identity/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshAccessToken(): Promise<AuthResponse | null> {
  const res = await fetch(buildApiUrl("/api/identity/refresh"), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json() as Promise<AuthResponse>;
}

export async function signOut(accessToken: string): Promise<void> {
  await fetch(buildApiUrl("/api/identity/signout"), {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function fetchMe(accessToken: string): Promise<User | null> {
  const res = await fetch(buildApiUrl("/api/identity/me"), {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<User>;
}
