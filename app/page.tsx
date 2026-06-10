"use client";

import { AppShell } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CricketIcon } from "@/components/CricketIcon";
import { HydrationGate } from "@/components/HydrationGate";
import { pathForPhase } from "@/lib/routes";
import { useMatchStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const phase = useMatchStore((s) => s.phase);
  const beginNewMatch = useMatchStore((s) => s.beginNewMatch);
  const [confirmNew, setConfirmNew] = useState(false);

  const inProgress = phase !== "home";

  const goToNewMatchSetup = useCallback(() => {
    beginNewMatch();
    router.push("/setup");
  }, [beginNewMatch, router]);

  return (
    <AppShell>
      <HydrationGate>
        <div className="space-y-3">
          <section className="relative overflow-hidden rounded-2xl bg-pitch px-5 pb-5 pt-6 text-center shadow-lg">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/5"
              aria-hidden
            />
            <CricketIcon className="relative mx-auto h-12 w-12 text-white/90" />
            <p className="relative mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/90">
              Blacktown
            </p>
            <h1 className="relative mt-0.5 text-2xl font-extrabold tracking-tight text-white">
              No Blowers
            </h1>
          </section>

          {inProgress && (
            <Link
              href={pathForPhase(phase)}
              className="flex h-10 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-md transition active:scale-[0.99] hover:bg-emerald-500"
            >
              Resume match
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              if (inProgress) setConfirmNew(true);
              else goToNewMatchSetup();
            }}
            className="flex h-10 w-full items-center justify-center rounded-xl bg-white text-sm font-bold text-pitch shadow-sm ring-1 ring-zinc-200 transition active:scale-[0.99] hover:bg-pitch-light dark:bg-zinc-900 dark:text-emerald-400 dark:ring-zinc-700 dark:hover:bg-zinc-800"
          >
            {inProgress ? "New match…" : "New match"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/matches"
              className="flex h-14 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white px-2 py-2 text-center shadow-sm transition hover:border-emerald-300 hover:bg-pitch-light/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800 dark:hover:bg-zinc-800/80"
            >
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                Matches
              </span>
              <span className="mt-0.5 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                History &amp; share
              </span>
            </Link>
            <Link
              href="/scoreboard"
              className="flex h-14 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white px-2 py-2 text-center shadow-sm transition hover:border-emerald-300 hover:bg-pitch-light/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800 dark:hover:bg-zinc-800/80"
            >
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                Live board
              </span>
              <span className="mt-0.5 text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                Read-only view
              </span>
            </Link>
          </div>

          <ConfirmModal
            open={confirmNew}
            title="Start a new match?"
            message="This clears the current match from this device. Saved progress will be lost."
            confirmLabel="Discard & start fresh"
            danger
            onClose={() => setConfirmNew(false)}
            onConfirm={() => {
              goToNewMatchSetup();
            }}
          />
        </div>
      </HydrationGate>
    </AppShell>
  );
}
