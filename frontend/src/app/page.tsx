"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getToken, login } from "@/lib/api";

const DEMO = { email: "demo@example.com", password: "demo-pass-1234" };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO.email);
  const [password, setPassword] = useState(DEMO.password);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <section className="hidden flex-col justify-center md:flex">
          <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-accent/15 text-accent-soft">
            <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden>
              <path
                d="M4 18V6m0 6h7m0 6V6l9 12V6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-white">SaaS Dashboard</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            Every organisation here is a real tenant with its own roles, plan and metered
            usage. Sign in and watch the quota move.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-zinc-500">
            <li>· JWT carrying the active organisation</li>
            <li>· Owner / admin / member permissions</li>
            <li>· Plans, checkout and a 402 when the quota is spent</li>
          </ul>
        </section>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-line bg-panel/70 p-6 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <h2 className="text-base font-semibold text-white">Sign in</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Demo account is pre-filled. It belongs to the Acme Labs organisation.
          </p>

          <label className="mt-5 block">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-accent/70"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-accent/70"
            />
          </label>

          {error ? (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-40"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-[11px] text-zinc-600">
            Seeded with <code className="text-zinc-400">python manage.py seed_demo</code>
          </p>
        </form>
      </div>
    </main>
  );
}
