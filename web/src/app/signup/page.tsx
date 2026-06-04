"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RolePicker } from "./role-picker";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState("en");
  const [role, setRole] = useState<"Guest" | "Host">("Guest");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ email, password, displayName, preferredLanguage: language, intendedRole: role });
      router.push("/account");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="mb-6 text-3xl font-bold">Create your DodoStays account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <RolePicker value={role} onChange={setRole} />
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full rounded border border-gray-300 p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="text"
          required
          placeholder="Display name"
          className="w-full rounded border border-gray-300 p-3"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <select
          className="w-full rounded border border-gray-300 p-3"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="mfe">Kreol Morisien</option>
        </select>
        <input
          type="password"
          required
          minLength={10}
          placeholder="Password (10+ chars, mixed case, digit)"
          className="w-full rounded border border-gray-300 p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        Already have an account? <Link href="/signin" className="underline">Sign in</Link>
      </p>
    </main>
  );
}
