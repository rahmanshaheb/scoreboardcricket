"use client";

import type { MatchLibraryItem } from "@/lib/db/queries";
import { parseSnapshotJson } from "@/lib/match-view";
import { pathForPhase } from "@/lib/routes";
import { useMatchStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

function scoreboardPath(externalId: string): string {
  return `/match/${externalId}/scoreboard`;
}

function shareUrl(externalId: string): string {
  if (typeof window === "undefined") return scoreboardPath(externalId);
  return `${window.location.origin}${scoreboardPath(externalId)}`;
}

function statusClass(label: string): string {
  switch (label) {
    case "In progress":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "Innings break":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
    default:
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

export function MatchesLibrary({ matches }: { matches: MatchLibraryItem[] }) {
  const router = useRouter();
  const loadFromSnapshot = useMatchStore((s) => s.loadFromSnapshot);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openMatch = useCallback(
    async (item: MatchLibraryItem) => {
      if (!item.hasSnapshot) {
        setError("This match has no saved data to open.");
        return;
      }
      setError(null);
      setBusyId(item.externalId);
      try {
        const res = await fetch(
          `/api/matches/live?externalId=${encodeURIComponent(item.externalId)}`
        );
        if (!res.ok) {
          setError("Could not load match from the server.");
          return;
        }
        const row = (await res.json()) as { stateJson: string };
        const snap = parseSnapshotJson(row.stateJson);
        if (!snap) {
          setError("Match data on the server is invalid.");
          return;
        }
        const finished = item.statusLabel === "Finished";
        loadFromSnapshot(snap, { forEdit: finished });
        router.push(finished ? "/scoring" : pathForPhase(snap.phase));
      } catch {
        setError("Network error while loading the match.");
      } finally {
        setBusyId(null);
      }
    },
    [loadFromSnapshot, router]
  );

  const copyShare = useCallback(async (externalId: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(externalId));
      setCopiedId(externalId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy link — try opening the scoreboard instead.");
    }
  }, []);

  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
        No saved matches yet. Start scoring and your matches will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}
      <ul className="space-y-3">
        {matches.map((m) => (
          <li
            key={m.externalId}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {m.teamAName}{" "}
                  <span className="font-normal text-zinc-400">vs</span>{" "}
                  {m.teamBName}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
                  {new Date(m.updatedAt).toLocaleString()} · {m.scoreSummary}
                </p>
                {m.headline && (
                  <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
                    {m.headline}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(m.statusLabel)}`}
              >
                {m.statusLabel}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              <button
                type="button"
                disabled={!m.hasSnapshot || busyId === m.externalId}
                onClick={() => openMatch(m)}
                className="min-h-10 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-40"
              >
                {busyId === m.externalId
                  ? "Loading…"
                  : m.statusLabel === "Finished"
                    ? "Edit"
                    : "Resume"}
              </button>
              <Link
                href={scoreboardPath(m.externalId)}
                className="flex min-h-10 items-center justify-center rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-100"
              >
                Scoreboard
              </Link>
              <button
                type="button"
                onClick={() => copyShare(m.externalId)}
                className="col-span-2 min-h-10 rounded-xl border border-violet-400 bg-violet-50 text-sm font-semibold text-violet-900 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-200 sm:col-span-1"
              >
                {copiedId === m.externalId ? "Link copied!" : "Copy share link"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
