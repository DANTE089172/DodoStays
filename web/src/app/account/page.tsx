"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  if (loading) return <main className="p-8">Loading…</main>;
  if (!user) return null;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Welcome, {user.displayName}</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-semibold">Email</dt><dd>{user.email}</dd>
        <dt className="font-semibold">Role</dt><dd>{user.role}</dd>
        <dt className="font-semibold">KYC</dt><dd>{user.kycStatus}</dd>
        <dt className="font-semibold">Language</dt><dd>{user.preferredLanguage}</dd>
      </dl>
      {user.role === "Host" && (
        <p className="mt-4">
          <Link href="/host/listings" className="underline">Manage my listings →</Link>
        </p>
      )}
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
        className="mt-8 rounded border border-black px-4 py-2"
      >
        Sign out
      </button>
    </main>
  );
}
