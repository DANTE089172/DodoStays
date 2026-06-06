"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { PillButton } from "@/components/marketing/pill-button";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push("/account");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* LEFT — cinema column */}
      <aside className="surface-cinema relative hidden md:flex md:flex-col md:items-center md:justify-center md:px-12 md:py-16">
        <div className="max-w-md text-center">
          <Eyebrow tone="peach">welcome back</Eyebrow>
          <DisplayHeading
            level={1}
            italic
            className="mt-6 text-[color:var(--color-foreground)]"
          >
            Stay where the sea meets the road.
          </DisplayHeading>
        </div>
      </aside>

      {/* RIGHT — cream column with form card */}
      <section className="flex min-h-screen items-center justify-center bg-[var(--color-sand)] px-6 py-16 sm:px-10">
        <div className="w-full max-w-[400px]">
          <p className="font-[family-name:var(--font-fraunces)] text-[24px] leading-none tracking-[-0.01em] text-[var(--color-foreground)]">
            DodoStays
          </p>
          <DisplayHeading level={3} className="mt-8">
            Sign in
          </DisplayHeading>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            to your DodoStays account
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-[12px] tracking-[0.18em] uppercase font-medium text-[var(--color-muted-foreground)] mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-md border border-[color:rgba(10,9,8,0.15)] bg-white text-[16px] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <label
                  htmlFor="password"
                  className="block text-[12px] tracking-[0.18em] uppercase font-medium text-[var(--color-muted-foreground)]"
                >
                  Password
                </label>
                <Link
                  href="#"
                  className="text-[12px] text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-md border border-[color:rgba(10,9,8,0.15)] bg-white text-[16px] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            {error && (
              <p
                role="alert"
                className="mt-1 text-[12px] text-[var(--color-destructive)]"
              >
                {error}
              </p>
            )}
            <PillButton
              type="submit"
              variant="solid"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </PillButton>
          </form>

          <div className="mt-10 flex items-center gap-4">
            <span className="h-px flex-1 bg-[color:rgba(10,9,8,0.15)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              or
            </span>
            <span className="h-px flex-1 bg-[color:rgba(10,9,8,0.15)]" />
          </div>

          <p className="mt-8 text-center text-sm text-[var(--color-muted-foreground)]">
            New to DodoStays?{" "}
            <Link
              href="/signup"
              className="text-[var(--color-primary)] underline underline-offset-4 transition-colors duration-200 ease-out hover:text-[var(--color-primary-hover)]"
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
