"use client";

import { DownloadMatchExcelButton } from "@/components/DownloadMatchExcelButton";
import { MatchDbSync } from "@/components/MatchDbSync";
import { computeOutcome } from "@/lib/match-result";
import { oversFormat, pairPlayerNamesFromIds } from "@/lib/scoring";
import { formatWicketDetailed } from "@/lib/wicket-format";
import { useMatchStore } from "@/lib/store";
import type { BallEvent, LiveInnings, MatchConfig, Side } from "@/lib/types";
import Link from "next/link";

function InningsWicketList({
  config,
  innings,
  battingSide,
}: {
  config: MatchConfig;
  innings: LiveInnings;
  battingSide: Side;
}) {
  const ws = innings.events.filter((e: BallEvent) => e.kind === "wicket");
  if (ws.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        Wickets ({ws.length})
      </h3>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {ws.map((e) => (
          <li key={e.id} className="pl-1">
            {e.wicket
              ? formatWicketDetailed(
                  e.wicket,
                  config,
                  battingSide,
                  e.pairIndex
                )
              : e.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MatchSummaryPanel() {
  const config = useMatchStore((s) => s.config);
  const first = useMatchStore((s) => s.innings1Result);
  const second = useMatchStore((s) => s.innings2Result);

  if (!config || !first || !second) {
    return (
      <p className="text-sm text-zinc-500">
        Summary unavailable — complete both innings first.
      </p>
    );
  }

  const outcome = computeOutcome(config, first, second);
  const roster1 =
    first.battingSide === "a" ? config.teamA : config.teamB;
  const roster2 =
    second.battingSide === "a" ? config.teamA : config.teamB;

  const PairTable = ({
    title,
    roster,
    innings,
  }: {
    title: string;
    roster: typeof config.teamA;
    innings: typeof first;
  }) => (
    <div className="mt-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        {title} — pairs
      </h3>
      <ul className="mt-2 space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        {innings.completedPairs.map((p) => {
          const [a, b] = pairPlayerNamesFromIds(roster, p.playerIds);
          return (
            <li
              key={p.pairNumber}
              className="flex justify-between gap-2 border-b border-zinc-200/80 py-1 last:border-0 dark:border-zinc-700"
            >
              <span className="text-zinc-600 dark:text-zinc-400">
                P{p.pairNumber}: {a} & {b}
              </span>
              <span className="tabular-nums font-medium">
                {p.runs} r · {p.wicketEvents} w · {oversFormat(p.legalBalls)} ov
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-white p-6 text-center dark:from-emerald-950/50 dark:to-zinc-900">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          Result
        </p>
        <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {outcome.headline}
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {outcome.detail}
        </p>
      </div>

      <div className="grid gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {first.battingSide === "a" ? config.teamA.name : config.teamB.name}{" "}
            (1st inns)
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {first.runs}{" "}
            <span className="text-lg text-zinc-500">
              / {first.wicketEvents} wkts
            </span>
          </p>
          <p className="text-sm text-zinc-500">
            {oversFormat(first.legalBalls)} ov · wicket penalties:{" "}
            {first.wicketPenaltyRuns} runs
          </p>
          <PairTable
            title={first.battingSide === "a" ? config.teamA.name : config.teamB.name}
            roster={roster1}
            innings={first}
          />
          <InningsWicketList
            config={config}
            innings={first}
            battingSide={first.battingSide}
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {second.battingSide === "a" ? config.teamA.name : config.teamB.name}{" "}
            (2nd inns)
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {second.runs}{" "}
            <span className="text-lg text-zinc-500">
              / {second.wicketEvents} wkts
            </span>
          </p>
          <p className="text-sm text-zinc-500">
            {oversFormat(second.legalBalls)} ov · wicket penalties:{" "}
            {second.wicketPenaltyRuns} runs
          </p>
          <PairTable
            title={second.battingSide === "a" ? config.teamA.name : config.teamB.name}
            roster={roster2}
            innings={second}
          />
          <InningsWicketList
            config={config}
            innings={second}
            battingSide={second.battingSide}
          />
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
        <p>
          Toss:{" "}
          <strong>
            {config.tossWinner === "a" ? config.teamA.name : config.teamB.name}
          </strong>{" "}
          won · First to bat:{" "}
          <strong>
            {config.batFirst === "a" ? config.teamA.name : config.teamB.name}
          </strong>
        </p>
        <p className="mt-1">{config.maxOvers} overs per innings</p>
      </div>

      <MatchDbSync />

      <DownloadMatchExcelButton config={config} first={first} second={second} />

      <Link
        href="/"
        className="flex h-14 items-center justify-center rounded-2xl bg-zinc-900 text-base font-bold text-white dark:bg-emerald-600"
      >
        Back home
      </Link>
    </div>
  );
}
