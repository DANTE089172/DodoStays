"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RolePicker } from "./role-picker";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { BatikPattern } from "@/components/decorations/batik-pattern";

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
              vini parmi nou
            </p>
            <h1 className="mt-1 font-display text-3xl leading-[1.1] tracking-[-0.02em]">
              Create your account.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              Join DodoStays to book or host stays across Mauritius.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label>I am</Label>
              <RolePicker value={role} onChange={setRole} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                required
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-name">Display name</Label>
              <Input
                id="signup-name"
                type="text"
                required
                placeholder="Display name"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-lang">Preferred language</Label>
              <Select
                id="signup-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="mfe">Kreol Morisien</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                required
                minLength={10}
                placeholder="Password (10+ chars, mixed case, digit)"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-[var(--color-muted-foreground)]">
                At least 10 characters with mixed case and a digit.
              </p>
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
              {submitting ? "Creating…" : "Create account"}
            </Button>
          </form>
        </div>
        <p className="mt-8 text-center text-sm text-[var(--color-muted-foreground)]">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-[var(--color-primary)] underline underline-offset-4 transition-colors duration-200 ease-out hover:text-[var(--color-accent)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
