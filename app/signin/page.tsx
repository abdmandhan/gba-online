"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Sign up failed");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) throw new Error("Invalid email or password");

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="panel w-full max-w-md p-8">
        <Link href="/" className="pixel text-xs glow-green no-underline">
          ← GBA·ONLINE
        </Link>
        <h1 className="pixel mt-6 text-lg glow-cyan">
          {mode === "signin" ? "PRESS START" : "NEW GAME"}
        </h1>
        <p className="mt-2 text-lg text-[var(--foreground)]">
          {mode === "signin"
            ? "Sign in to load your saves."
            : "Create an account to save your progress."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "signup" && (
            <label className="block">
              <span className="pixel text-[10px] text-[var(--neon-cyan)]">
                NAME (optional)
              </span>
              <input
                className="input-retro mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label className="block">
            <span className="pixel text-[10px] text-[var(--neon-cyan)]">
              EMAIL
            </span>
            <input
              className="input-retro mt-2"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="pixel text-[10px] text-[var(--neon-cyan)]">
              PASSWORD
            </span>
            <input
              className="input-retro mt-2"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
          </label>

          {error && (
            <p className="pixel text-[10px] leading-relaxed glow-magenta">
              {error}
            </p>
          )}

          <button type="submit" className="btn-arcade mt-2" disabled={busy}>
            {busy ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-6 w-full text-center text-lg text-[var(--neon-cyan)] underline"
        >
          {mode === "signin"
            ? "No account? Create one"
            : "Have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
