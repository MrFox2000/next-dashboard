"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  cancelSubscription,
  clearTokens,
  fetchCurrentOrg,
  fetchPlans,
  generateReport,
  inviteMember,
  removeMember,
  startCheckout,
} from "@/lib/api";
import type { CurrentOrg, Plan, ReportResult } from "@/lib/types";

function Meter({ used, limit }: { used: number; limit: number }) {
  const percent = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const tone = percent >= 100 ? "bg-bad" : percent >= 75 ? "bg-warn" : "bg-good";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-zinc-400">API calls this month</span>
        <span className="font-mono text-xs text-zinc-300">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel-soft">
        <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<CurrentOrg | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [org, planList] = await Promise.all([fetchCurrentOrg(), fetchPlans()]);
      setData(org);
      setPlans(planList);
      setError(null);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        clearTokens();
        router.replace("/");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Could not load the workspace");
    }
  }, [router]);

  useEffect(() => {
    // The fetch lives inside the effect so state is only touched after an await.
    let cancelled = false;

    void (async () => {
      try {
        const [org, planList] = await Promise.all([fetchCurrentOrg(), fetchPlans()]);
        if (cancelled) return;
        setData(org);
        setPlans(planList);
        setError(null);
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) {
          clearTokens();
          router.replace("/");
          return;
        }
        setError(caught instanceof Error ? caught.message : "Could not load the workspace");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const withBusy = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 402) {
        setUpgradeNeeded(true);
      }
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const runReport = () =>
    withBusy("report", async () => {
      const result = await generateReport();
      setReport(result);
      setUpgradeNeeded(false);
      await load();
    });

  const invite = () =>
    withBusy("invite", async () => {
      await inviteMember(inviteEmail.trim(), "member");
      setInviteEmail("");
      setNotice("Member added");
      await load();
    });

  const remove = (id: number) =>
    withBusy(`remove-${id}`, async () => {
      await removeMember(id);
      await load();
    });

  const upgrade = (code: string) =>
    withBusy(`plan-${code}`, async () => {
      const session = await startCheckout(code);
      setNotice(`Checkout started (${session.provider} provider). You are now on ${code}.`);
      setUpgradeNeeded(false);
      await load();
    });

  const cancel = () =>
    withBusy("cancel", async () => {
      await cancelSubscription();
      setNotice("Subscription cancelled");
      await load();
    });

  if (!data) {
    return (
      <div className="rounded-2xl border border-line bg-panel/60 p-6 text-sm text-zinc-400">
        {error ?? "Loading workspace…"}
      </div>
    );
  }

  const { organization, role, members, subscription, quota } = data;
  const canManage = role === "owner" || role === "admin";
  const plan = subscription?.plan;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Organisation" value={organization.name} hint={`your role: ${role}`} />
        <Card
          label="Plan"
          value={plan?.name ?? "Free"}
          hint={plan ? `${plan.price_display} / month` : "no subscription"}
        />
        <Card
          label="Members"
          value={String(members.length)}
          hint={plan ? `${members.length} of ${plan.seats} seats` : undefined}
        />
        <Card label="Remaining calls" value={quota.remaining.toLocaleString()} hint={`period ${quota.period}`} />
      </section>

      <section className="rounded-2xl border border-line bg-panel/60 p-5">
        <Meter used={quota.used} limit={quota.limit} />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runReport}
            disabled={busy === "report"}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-soft disabled:opacity-40"
          >
            {busy === "report" ? "Working…" : "Generate report (1 call)"}
          </button>
          <span className="text-xs text-zinc-500">
            This endpoint really consumes a call from your plan.
          </span>
        </div>

        {upgradeNeeded ? (
          <p className="mt-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            Quota exhausted. Pick a bigger plan below to keep going.
          </p>
        ) : null}

        {report ? (
          <pre className="scroll-area mt-4 max-h-56 overflow-auto rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-zinc-400">
            {JSON.stringify(report, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-panel/60 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Members</h2>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">{members.length} total</span>
        </div>

        {canManage ? (
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void invite();
            }}
          >
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@example.com"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-100 outline-none focus:border-accent/70"
            />
            <button
              type="submit"
              disabled={busy === "invite"}
              className="rounded-lg border border-line bg-panel-soft px-4 py-2 text-sm text-zinc-200 transition hover:border-accent/60 disabled:opacity-40"
            >
              Add member
            </button>
          </form>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">Only owners and admins can manage members.</p>
        )}

        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Joined</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((member) => (
              <tr key={member.id} className="text-zinc-300">
                <td className="py-2.5">{member.email}</td>
                <td className="py-2.5">
                  <span className="rounded-md border border-line bg-panel-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-400">
                    {member.role}
                  </span>
                </td>
                <td className="py-2.5 text-xs text-zinc-500">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                <td className="py-2.5 text-right">
                  {canManage && member.role !== "owner" ? (
                    <button
                      type="button"
                      onClick={() => void remove(member.id)}
                      disabled={busy === `remove-${member.id}`}
                      className="text-xs text-zinc-500 transition hover:text-bad disabled:opacity-40"
                    >
                      remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-line bg-panel/60 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Plans</h2>
          {subscription && role === "owner" ? (
            <button
              type="button"
              onClick={() => void cancel()}
              disabled={busy === "cancel"}
              className="text-xs text-zinc-500 transition hover:text-bad disabled:opacity-40"
            >
              cancel subscription
            </button>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {plans.map((option) => {
            const current = plan?.code === option.code;
            return (
              <div
                key={option.id}
                className={`rounded-xl border p-4 ${
                  current ? "border-accent/60 bg-accent/5" : "border-line bg-surface/60"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-white">{option.name}</p>
                  <p className="text-sm text-zinc-300">{option.price_display}</p>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {option.monthly_api_calls.toLocaleString()} calls · {option.seats} seat
                  {option.seats > 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  disabled={current || !canManage || busy === `plan-${option.code}`}
                  onClick={() => void upgrade(option.code)}
                  className="mt-3 w-full rounded-lg border border-line px-3 py-1.5 text-xs text-zinc-200 transition hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {current ? "Current plan" : "Switch to this plan"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] text-zinc-600">
          Without a Stripe key the backend uses its fake provider: the plan really changes, only
          the payment page is skipped.
        </p>
      </section>

      {notice ? (
        <p className="rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-sm text-good">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
