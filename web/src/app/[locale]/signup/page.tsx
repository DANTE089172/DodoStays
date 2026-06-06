"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RolePicker } from "./role-picker";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { PillButton } from "@/components/marketing/pill-button";

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

  const inputClass =
    "w-full h-12 px-4 rounded-md border border-[color:rgba(10,9,8,0.15)] bg-white text-[16px] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent";
  const labelClass =
    "block text-[12px] tracking-[0.18em] uppercase font-medium text-[var(--color-muted-foreground)] mb-2";

  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* LEFT — cinema column */}
      <aside className="surface-cinema relative hidden md:flex md:flex-col md:items-center md:justify-center md:px-12 md:py-16">
        <div className="max-w-md text-center">
          <Eyebrow tone="peach">join us</Eyebrow>
          <DisplayHeading
            level={1}
            italic
            className="mt-6 text-[color:var(--color-foreground)]"
          >
            Find your kind of Mauritius.
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
            Create your account
          </DisplayHeading>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Join DodoStays to book or host stays across Mauritius.
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-6">
            <div>
              <span className={labelClass}>I am</span>
              <RolePicker value={role} onChange={setRole} />
            </div>
            <div>
              <label htmlFor="signup-email" className={labelClass}>
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="signup-name" className={labelClass}>
                Display name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="signup-lang" className={labelClass}>
                Preferred language
              </label>
              <select
                id="signup-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="mfe">Kreol Morisien</option>
              </select>
            </div>
            <div>
              <label htmlFor="signup-password" className={labelClass}>
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <p className="mt-2 text-[12px] text-[var(--color-muted-foreground)]">
                At least 10 characters with mixed case and a digit.
              </p>
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
              {submitting ? "Creating…" : "Create account"}
            </PillButton>
          </form>

          <p className="mt-10 text-center text-sm text-[var(--color-muted-foreground)]">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-[var(--color-primary)] underline underline-offset-4 transition-colors duration-200 ease-out hover:text-[var(--color-primary-hover)]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
