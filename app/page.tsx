"use client";

import { AppShell } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
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
    <AppShell title="Home">
      <HydrationGate>
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Pair cricket
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Ten players, five pairs, wicket = −5 runs. Built for fast tap scoring
              on the sideline.
            </p>
          </div>

          {inProgress && (
            <Link
              href={pathForPhase(phase)}
              className="flex h-14 items-center justify-center rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-md active:scale-[0.99]"
            >
              Resume match
            </Link>
          )}

          <Link
            href="/matches"
            className="flex h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white text-sm font-bold text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            All matches
          </Link>

          <Link
            href="/scoreboard"
            className="flex h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white text-sm font-bold text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            Open live scoreboard (read-only)
          </Link>

          <button
            type="button"
            onClick={() => {
              if (inProgress) setConfirmNew(true);
              else goToNewMatchSetup();
            }}
            className="flex h-14 w-full items-center justify-center rounded-2xl border-2 border-emerald-600 bg-transparent text-base font-bold text-emerald-700 dark:text-emerald-400"
          >
            {inProgress ? "New match…" : "New match"}
          </button>

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
