"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearTokens, getToken } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="size-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent-soft">
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
              <path
                d="M4 18V6m0 6h7m0 6V6l9 12V6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white">SaaS Dashboard</h1>
            <p className="text-xs text-zinc-500">Multi-tenant workspace</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            clearTokens();
            router.replace("/");
          }}
          className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-zinc-300 transition hover:border-accent/60 hover:text-white"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="pt-6 text-center text-[11px] text-zinc-600">
        Next.js dashboard · Django + DRF API · JWT with an org claim
      </footer>
    </div>
  );
}
