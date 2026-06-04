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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-[var(--color-sand)] to-[var(--color-background)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <Card>
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Join DodoStays to book or host stays across Mauritius.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>I am</Label>
                <RolePicker value={role} onChange={setRole} />
              </div>
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? "Creating…" : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-[var(--color-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
