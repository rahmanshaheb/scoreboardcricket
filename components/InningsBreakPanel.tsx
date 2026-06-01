"use client";

import {
  oversFormat,
  pairPlayerNamesFromIds,
} from "@/lib/scoring";
import { useMatchStore } from "@/lib/store";
import type { Side } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

function SlotSelect({
  label,
  players,
  value,
  onChange,
}: {
  label: string;
  players: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-zinc-500">
      {label}
      <select
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white py-2 pl-2 pr-8 text-base dark:border-zinc-600 dark:bg-zinc-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose…</option>
        {players.map((pl) => (
          <option key={pl.id} value={pl.id}>
            {pl.name || "Unnamed"}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InningsBreakPanel() {
  const router = useRouter();
  const config = useMatchStore((s) => s.config);
  const innings1Result = useMatchStore((s) => s.innings1Result);
  const setup = useMatchStore((s) => s.setup);
  const setOpeningPairSlot = useMatchStore((s) => s.setOpeningPairSlot);
  const startSecondInnings = useMatchStore((s) => s.startSecondInnings);

  const chaseSide: Side | null = useMemo(() => {
    if (!innings1Result) return null;
    return innings1Result.battingSide === "a" ? "b" : "a";
  }, [innings1Result]);

  if (!config || !innings1Result || !chaseSide) return null;

  const bat = innings1Result.battingSide;
  const batName = bat === "a" ? config.teamA.name : config.teamB.name;
  const chaseName = chaseSide === "a" ? config.teamA.name : config.teamB.name;
  const roster = bat === "a" ? config.teamA : config.teamB;

  const chasePlayers =
    chaseSide === "a" ? setup.playersA : setup.playersB;
  const chaseOpen =
    chaseSide === "a" ? setup.openingPairA : setup.openingPairB;
  const c1 = chaseOpen?.[0] ?? "";
  const c2 = chaseOpen?.[1] ?? "";
  const chaseReady =
    Boolean(c1 && c2 && c1 !== c2) &&
    chasePlayers.some((p) => p.id === c1) &&
    chasePlayers.some((p) => p.id === c2);

  const onStart = () => {
    if (!chaseReady) return;
    startSecondInnings();
    router.push("/scoring");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          First innings complete
        </p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-950 dark:text-emerald-100">
          {batName}: {innings1Result.runs}{" "}
          <span className="text-xl font-semibold text-emerald-700 dark:text-emerald-400">
            / {innings1Result.wicketEvents} wkts
          </span>
        </p>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
          {oversFormat(innings1Result.legalBalls)} overs · wicket penalties:{" "}
          {innings1Result.wicketPenaltyRuns} runs
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Pair breakdown (1st innings)
        </h2>
        <ul className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          {innings1Result.completedPairs.map((p) => {
            const [a, b] = pairPlayerNamesFromIds(roster, p.playerIds);
            return (
              <li
                key={p.pairNumber}
                className="flex justify-between gap-2 border-b border-zinc-100 pb-2 text-sm last:border-0 dark:border-zinc-800"
              >
                <span>
                  Pair {p.pairNumber}: {a} & {b}
                </span>
                <span className="shrink-0 tabular-nums font-semibold">
                  {p.runs} r · {p.wicketEvents} w · {oversFormat(p.legalBalls)}{" "}
                  ov
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          {chaseName} — opening pair (Pair 1)
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Select who opens the chase. Other pairs are chosen after each 4-over
          block.
        </p>
        <div className="mt-3 grid gap-3">
          <SlotSelect
            label="Batter 1"
            players={chasePlayers}
            value={c1}
            onChange={(id) => setOpeningPairSlot(chaseSide, 0, id)}
          />
          <SlotSelect
            label="Batter 2"
            players={chasePlayers}
            value={c2}
            onChange={(id) => setOpeningPairSlot(chaseSide, 1, id)}
          />
        </div>
      </div>

      <div className="rounded-xl bg-amber-100 p-4 text-center dark:bg-amber-900/30">
        <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
          {chaseName} need {innings1Result.runs + 1} runs to win
        </p>
        <p className="text-xs text-amber-900/80 dark:text-amber-200/90">
          Tie if both sides finish on {innings1Result.runs}
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!chaseReady}
        className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg active:scale-[0.99] disabled:opacity-40"
      >
        Start second innings
      </button>
    </div>
  );
}
