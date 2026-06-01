"use client";

import { computeOutcome } from "@/lib/match-result";
import { oversFormat, pairPlayerNamesFromIds } from "@/lib/scoring";
import { useMatchStore } from "@/lib/store";
import type { LiveInnings, MatchConfig } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

function InningsBlock({
  title,
  config,
  inn,
}: {
  title: string;
  config: MatchConfig;
  inn: LiveInnings;
}) {
  const roster =
    inn.battingSide === "a" ? config.teamA : config.teamB;
  const name = roster.name;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
        {title} — {name}
      </h3>
      <p className="mt-2 text-3xl font-bold tabular-nums">
        {inn.runs}{" "}
        <span className="text-lg font-semibold text-zinc-500">
          / {inn.wicketEvents} wkts
        </span>
      </p>
      <p className="text-sm text-zinc-500">
        {oversFormat(inn.legalBalls)} overs · −{inn.wicketPenaltyRuns} from wicket
        penalties
      </p>
      <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
        {inn.completedPairs.map((p) => {
          const [n1, n2] = pairPlayerNamesFromIds(roster, p.playerIds);
          return (
            <li
              key={p.pairNumber}
              className="flex justify-between gap-2 text-zinc-700 dark:text-zinc-300"
            >
              <span>
                Pair {p.pairNumber}: {n1} & {n2}
              </span>
              <span className="tabular-nums font-medium">
                {p.runs} r, {p.wicketEvents} w · {oversFormat(p.legalBalls)} ov
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MatchSummaryCard() {
  const router = useRouter();
  const config = useMatchStore((s) => s.config);
  const inn1 = useMatchStore((s) => s.innings1Result);
  const inn2 = useMatchStore((s) => s.innings2Result);
  const resetAll = useMatchStore((s) => s.resetAll);

  if (!config || !inn1 || !inn2) {
    return (
      <p className="text-center text-sm text-zinc-500">
        No complete match to show.
      </p>
    );
  }

  const outcome = computeOutcome(config, inn1, inn2);
  const totalPenalties = inn1.wicketPenaltyRuns + inn2.wicketPenaltyRuns;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-center text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-90">
          Result
        </p>
        <p className="mt-2 text-2xl font-bold">{outcome.headline}</p>
        <p className="mt-2 text-sm opacity-90">{outcome.detail}</p>
      </div>

      <InningsBlock title="First innings" config={config} inn={inn1} />
      <InningsBlock title="Second innings" config={config} inn={inn2} />

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
          Match totals
        </p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Combined wicket penalties:{" "}
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            −{totalPenalties} runs
          </span>{" "}
          ({inn1.wicketEvents + inn2.wicketEvents} wicket events)
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            resetAll();
            router.push("/");
          }}
          className="h-14 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg"
        >
          New match
        </button>
        <Link
          href="/"
          className="block h-12 rounded-xl border border-zinc-300 py-3 text-center text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
