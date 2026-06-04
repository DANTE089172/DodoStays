"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BatikPattern } from "@/components/decorations/batik-pattern";

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
    <main className="relative flex min-h-screen flex-col bg-[var(--color-background)]">
      <BatikPattern opacity={0.025} />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-4 flex flex-col items-center">
          <BrandMark />
          <p className="mt-3 font-script text-2xl text-[var(--color-ochre)]">
            welcome to Maurice.
          </p>
        </div>
        <div className="border-[1.5px] border-[var(--color-ochre)] bg-[var(--color-card)] p-10 shadow-block">
          <div className="mb-8">
            <p className="font-script text-2xl text-[var(--color-ochre)]">
              bonzour ankor
            </p>
            <h1 className="mt-1 font-display text-3xl leading-[1.1] tracking-[-0.02em]">
              Welcome back.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Sign in to manage your bookings and listings.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p
                role="alert"
                className="border-[1.5px] border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5 px-3 py-2 text-sm text-[var(--color-destructive)]"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full shadow-block"
              size="lg"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="mt-8 text-center text-sm text-[var(--color-muted-foreground)]">
          New to DodoStays?{" "}
          <Link
            href="/signup"
            className="text-[var(--color-primary)] underline underline-offset-4 transition-colors duration-200 ease-out hover:text-[var(--color-accent)]"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
