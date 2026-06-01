"use client";

import {
  LEGAL_BALLS_PER_PAIR_BLOCK,
  OVERS_PER_PAIR_BLOCK,
  TIMELINE_VISIBLE,
} from "@/lib/constants";
import { BowlerSelectModal } from "@/components/BowlerSelectModal";
import { ExtrasSheet } from "@/components/ExtrasSheet";
import { SelectNextPairModal } from "@/components/SelectNextPairModal";
import { WicketSheet } from "@/components/WicketSheet";
import { timelineCompactLabel } from "@/lib/event-label";
import {
  bowlingSide,
  ensureBowlerFigure,
  maxLegalBalls,
  oversFormat,
  pairPlayerNamesFromIds,
  playerById,
  remainingBatters,
} from "@/lib/scoring";
import { formatWicketShort } from "@/lib/wicket-format";
import { useMatchStore } from "@/lib/store";
import type { LiveInnings, MatchConfig } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

function StickyHeader({
  config,
  live,
  inningsNumber,
  firstInningsRuns,
}: {
  config: MatchConfig;
  live: LiveInnings;
  inningsNumber: 1 | 2;
  firstInningsRuns: number | null;
}) {
  const bat = live.battingSide;
  const bowl = bowlingSide(bat);
  const batName = bat === "a" ? config.teamA.name : config.teamB.name;
  const bowlName = bowl === "a" ? config.teamA.name : config.teamB.name;
  const roster = bat === "a" ? config.teamA : config.teamB;
  const bowlRoster = bowl === "a" ? config.teamA : config.teamB;
  const cap = maxLegalBalls(config.maxOvers);
  const pairDone = live.currentPairNumber > 5;
  const awaiting = live.awaitingNextPairSelection;
  const bowlerNm = live.currentBowlerPlayerId
    ? playerById(bowlRoster, live.currentBowlerPlayerId)
    : "—";

  const [p1, p2] = pairPlayerNamesFromIds(roster, live.currentPairPlayerIds);

  const striker =
    !pairDone && !awaiting && p1 !== "—"
      ? live.strikerIsFirst
        ? p1
        : p2
      : "—";
  const nonStriker =
    !pairDone && !awaiting && p1 !== "—"
      ? live.strikerIsFirst
        ? p2
        : p1
      : "—";

  return (
    <div className="sticky top-14 z-30 -mx-4 border-b border-zinc-200 bg-gradient-to-b from-emerald-50 to-zinc-50 px-4 py-3 shadow-sm dark:border-zinc-800 dark:from-emerald-950/40 dark:to-zinc-950">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Innings {inningsNumber} · {batName}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            vs {bowlName} (fielding)
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums leading-none tracking-tight">
            {live.runs}
            <span className="text-2xl font-semibold text-zinc-400 dark:text-zinc-500">
              {" "}
              / {live.wicketEvents} wkts
            </span>
          </p>
          <p className="mt-1 text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
            {oversFormat(live.legalBalls)} ov (legal) · {cap - live.legalBalls}{" "}
            legal left
          </p>
        </div>
      </div>
      {inningsNumber === 2 && firstInningsRuns !== null && (
        <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-center text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          Target {firstInningsRuns + 1} to win · Tie if {firstInningsRuns}
        </p>
      )}
      <div className="mt-3 grid gap-1 rounded-xl bg-white/80 p-3 text-sm dark:bg-zinc-900/80">
        {live.awaitingBowlerSelection && !awaiting ? (
          <p className="rounded-lg bg-amber-100 px-2 py-1.5 text-center text-xs font-bold text-amber-950 dark:bg-amber-900/40 dark:text-amber-100">
            Over complete — select the next bowler (cannot repeat last over’s
            bowler).
          </p>
        ) : null}
        <p>
          <span className="text-zinc-500">Bowler:</span>{" "}
          <span className="font-bold text-emerald-800 dark:text-emerald-300">
            {bowlerNm}
          </span>
        </p>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {awaiting
            ? "Select next pair"
            : pairDone
              ? "Innings complete"
              : `Pair ${live.currentPairNumber} of 5`}
        </p>
        {!pairDone && !awaiting && p1 !== "—" && (
          <>
            <p>
              <span className="text-zinc-500">Batters:</span>{" "}
              <span className="font-semibold">
                {p1} & {p2}
              </span>
            </p>
            <p className="tabular-nums text-zinc-600 dark:text-zinc-400">
              This pair: {live.currentPairRuns} runs ·{" "}
              {live.currentPairWicketEvents} wkts ·{" "}
              {oversFormat(live.pairBlockLegalBalls)} / {OVERS_PER_PAIR_BLOCK} overs
              <span className="text-zinc-400">
                {" "}
                ({live.pairBlockLegalBalls}/{LEGAL_BALLS_PER_PAIR_BLOCK} balls)
              </span>
            </p>
            <p>
              <span className="text-zinc-500">Striker:</span>{" "}
              <span className="font-semibold">{striker}</span>
            </p>
            <p>
              <span className="text-zinc-500">Non-striker:</span>{" "}
              <span className="font-semibold">{nonStriker}</span>
            </p>
          </>
        )}
        {(() => {
          const lastWicket = [...live.events]
            .reverse()
            .find((e) => e.kind === "wicket");
          if (!lastWicket) return null;
          const line = lastWicket.wicket
            ? formatWicketShort(
                lastWicket.wicket,
                config,
                live.battingSide
              )
            : lastWicket.label;
          return (
            <p className="mt-2 border-t border-zinc-200 pt-2 text-xs font-semibold text-red-800 dark:border-zinc-700 dark:text-red-300">
              Last wicket: {line}
            </p>
          );
        })()}
      </div>
    </div>
  );
}

function Timeline({ live }: { live: LiveInnings }) {
  const tail = live.events.slice(-TIMELINE_VISIBLE).reverse();
  if (tail.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        Tap a run or wicket to build the timeline.
      </p>
    );
  }
  return (
    <ul className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      {tail.map((e) => (
        <li
          key={e.id}
          className="flex justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
        >
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {timelineCompactLabel(e)}
          </span>
          <span className="shrink-0 tabular-nums text-zinc-500">
            {e.totalAfter}/{oversFormat(e.legalBallsAfter)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LiveScoring() {
  const [wicketOpen, setWicketOpen] = useState(false);
  const [pairModalError, setPairModalError] = useState<string | null>(null);
  const [bowlerModalError, setBowlerModalError] = useState<string | null>(null);
  const [extraKind, setExtraKind] = useState<"wide" | "no_ball" | null>(null);
  const [extraWicketKind, setExtraWicketKind] = useState<
    "wide" | "no_ball" | null
  >(null);
  const config = useMatchStore((s) => s.config);
  const live = useMatchStore((s) => s.live);
  const inningsNumber = useMatchStore((s) => s.inningsNumber);
  const innings1Result = useMatchStore((s) => s.innings1Result);
  const undoStack = useMatchStore((s) => s.undoStack);
  const matchSessionId = useMatchStore((s) => s.matchSessionId);

  const scoreRuns = useMatchStore((s) => s.scoreRuns);
  const scoreWide = useMatchStore((s) => s.scoreWide);
  const scoreNoBall = useMatchStore((s) => s.scoreNoBall);
  const scoreWicketWithDetail = useMatchStore(
    (s) => s.scoreWicketWithDetail
  );
  const scoreExtraWicketWithDetail = useMatchStore(
    (s) => s.scoreExtraWicketWithDetail
  );
  const setCurrentBowler = useMatchStore((s) => s.setCurrentBowler);
  const submitNextOverBowler = useMatchStore((s) => s.submitNextOverBowler);
  const scoreEndOver = useMatchStore((s) => s.scoreEndOver);
  const submitNextPairSelection = useMatchStore(
    (s) => s.submitNextPairSelection
  );
  const undo = useMatchStore((s) => s.undo);
  const endInningsManually = useMatchStore((s) => s.endInningsManually);

  useEffect(() => {
    if (!config || !live) return;
    if (live.awaitingBowlerSelection || live.awaitingNextPairSelection) return;
    if (live.currentBowlerPlayerId != null) return;
    const bowl = bowlingSide(live.battingSide);
    const roster = bowl === "a" ? config.teamA : config.teamB;
    const fid = roster.players[0]?.id;
    if (fid) setCurrentBowler(fid);
  }, [config, live, setCurrentBowler]);

  if (!config || !live) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">Updating…</p>
    );
  }

  const firstRuns = innings1Result?.runs ?? null;
  const battingRoster =
    live.battingSide === "a" ? config.teamA : config.teamB;
  const remaining = remainingBatters(battingRoster, live);

  const canDeliver =
    !live.awaitingNextPairSelection &&
    !live.awaitingBowlerSelection &&
    live.currentPairNumber <= 5 &&
    Boolean(live.currentPairPlayerIds[0]) &&
    Boolean(live.currentPairPlayerIds[1]) &&
    live.legalBalls < maxLegalBalls(config.maxOvers);

  const canLegalDelivery =
    canDeliver && Boolean(live.currentBowlerPlayerId);

  const runsPad = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  const bowlSide = bowlingSide(live.battingSide);
  const bowlingRoster = bowlSide === "a" ? config.teamA : config.teamB;
  const bowlerValue =
    live.currentBowlerPlayerId ?? bowlingRoster.players[0]?.id ?? "";

  const onPickNextPair = (a: string, b: string) => {
    const err = submitNextPairSelection([a, b]);
    setPairModalError(err);
  };

  const bowlerSelectLocked =
    live.awaitingBowlerSelection ||
    live.awaitingNextPairSelection ||
    (live.legalBalls % 6 !== 0 && live.legalBalls > 0);

  return (
    <div className="space-y-4">
      <BowlerSelectModal
        open={
          live.awaitingBowlerSelection && !live.awaitingNextPairSelection
        }
        bowlingRoster={bowlingRoster}
        lastOverBowlerId={live.lastCompletedOverBowlerPlayerId}
        error={bowlerModalError}
        onPick={(id) => {
          setBowlerModalError(null);
          const err = submitNextOverBowler(id);
          setBowlerModalError(err);
        }}
      />

      <ExtrasSheet
        open={extraKind != null}
        kind={extraKind}
        onClose={() => setExtraKind(null)}
        onPickWide={(n) => scoreWide(n)}
        onPickNoBall={(n) => scoreNoBall(n)}
      />

      <SelectNextPairModal
        open={live.awaitingNextPairSelection}
        remaining={remaining}
        pairNumber={live.currentPairNumber}
        error={pairModalError}
        onSubmit={(a, b) => {
          setPairModalError(null);
          onPickNextPair(a, b);
        }}
      />

      <StickyHeader
        config={config}
        live={live}
        inningsNumber={inningsNumber}
        firstInningsRuns={firstRuns}
      />

      <section aria-label="Current bowler">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Bowler (fielding team)
        </h2>
        <p className="mb-2 text-xs text-zinc-500">
          Changeable only between overs (start of innings or after 6 legal
          balls). Mid-over the bowler is locked.
        </p>
        <select
          className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-base dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          value={bowlerValue}
          disabled={bowlerSelectLocked}
          onChange={(e) =>
            setCurrentBowler(e.target.value ? e.target.value : null)
          }
        >
          {bowlingRoster.players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </section>

      <section aria-label="Scoring">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Runs
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {runsPad.map((n) => (
            <button
              key={n}
              type="button"
              disabled={!canLegalDelivery}
              onClick={() => scoreRuns(n)}
              className="h-14 rounded-2xl bg-zinc-900 text-lg font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-40 dark:bg-emerald-700 dark:text-white"
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Extras">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Extras (not legal balls)
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canLegalDelivery}
            onClick={() => setExtraKind("wide")}
            className="h-12 rounded-2xl border-2 border-violet-400 bg-violet-50 text-sm font-bold text-violet-900 disabled:opacity-40 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-200"
          >
            Wide
          </button>
          <button
            type="button"
            disabled={!canLegalDelivery}
            onClick={() => setExtraKind("no_ball")}
            className="h-12 rounded-2xl border-2 border-orange-400 bg-orange-50 text-sm font-bold text-orange-900 disabled:opacity-40 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200"
          >
            No ball
          </button>
          <button
            type="button"
            disabled={!canDeliver}
            onClick={() => {
              setWicketOpen(false);
              setExtraWicketKind("wide");
            }}
            className="h-12 rounded-2xl border-2 border-red-400 bg-red-50 text-sm font-bold text-red-900 disabled:opacity-40 dark:border-red-700 dark:bg-red-950/50 dark:text-red-200"
          >
            Wide + W
          </button>
          <button
            type="button"
            disabled={!canDeliver}
            onClick={() => {
              setWicketOpen(false);
              setExtraWicketKind("no_ball");
            }}
            className="h-12 rounded-2xl border-2 border-red-400 bg-red-50 text-sm font-bold text-red-900 disabled:opacity-40 dark:border-red-700 dark:bg-red-950/50 dark:text-red-200"
          >
            No ball + W
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canDeliver}
          onClick={() => {
            setExtraWicketKind(null);
            setWicketOpen(true);
          }}
          className="h-14 rounded-2xl border-2 border-red-400 bg-red-50 text-sm font-bold text-red-800 active:scale-[0.98] disabled:opacity-40 dark:bg-red-950/40 dark:text-red-200"
        >
          Wicket (−5)
        </button>
        <button
          type="button"
          disabled={!canLegalDelivery}
          onClick={() => scoreEndOver()}
          className="h-14 rounded-2xl border border-zinc-300 bg-white text-sm font-bold text-zinc-800 active:scale-[0.98] disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          End over
        </button>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => undo()}
          disabled={undoStack.length === 0}
          className="h-12 flex-1 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => endInningsManually()}
          className="h-12 flex-1 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
        >
          End innings now
        </button>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Last balls
        </h2>
        <Timeline live={live} />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Bowling (this innings)
        </h2>
        <ul className="space-y-1 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {bowlingRoster.players.filter((p) => {
            const f = ensureBowlerFigure(live.bowlerFigures, p.id);
            return (
              f.legalBallsBowled > 0 ||
              f.runsConceded > 0 ||
              f.wickets > 0
            );
          }).length === 0 ? (
            <li className="text-zinc-500">No deliveries yet.</li>
          ) : (
            bowlingRoster.players
              .filter((p) => {
                const f = ensureBowlerFigure(live.bowlerFigures, p.id);
                return (
                  f.legalBallsBowled > 0 ||
                  f.runsConceded > 0 ||
                  f.wickets > 0
                );
              })
              .map((p) => {
                const f = ensureBowlerFigure(live.bowlerFigures, p.id);
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap justify-between gap-2 border-b border-zinc-100 py-1 last:border-0 dark:border-zinc-800"
                  >
                    <span className="font-medium">{p.name || "?"}</span>
                    <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                      {f.oversCompleted} ov · {f.legalBallsBowled} legal ·{" "}
                      {f.runsConceded} rconc · {f.wickets} w
                    </span>
                  </li>
                );
              })
          )}
        </ul>
        <p className="mt-1 text-xs text-zinc-500">
          Figures update per delivery; extras count toward runs conceded.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Completed pairs (this innings)
        </h2>
        <ul className="space-y-1 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {live.completedPairs.length === 0 ? (
            <li className="text-zinc-500">None yet.</li>
          ) : (
            live.completedPairs.map((p) => {
              const [n1, n2] = pairPlayerNamesFromIds(battingRoster, p.playerIds);
              return (
                <li
                  key={p.pairNumber}
                  className="flex justify-between gap-2 border-b border-zinc-100 py-1 last:border-0 dark:border-zinc-800"
                >
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Pair {p.pairNumber}: {n1} & {n2}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold">
                    {p.runs} r · {p.wicketEvents} w · {oversFormat(p.legalBalls)}{" "}
                    ov
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {!live.awaitingNextPairSelection &&
        live.currentPairNumber <= 5 &&
        remaining.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
              Yet to bat
            </h2>
            <ul className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400">
              {remaining.map((p) => (
                <li key={p.id}>{p.name || "Unnamed"}</li>
              ))}
            </ul>
          </section>
        )}

      <WicketSheet
        open={wicketOpen || extraWicketKind != null}
        onClose={() => {
          setWicketOpen(false);
          setExtraWicketKind(null);
        }}
        config={config}
        live={live}
        onSubmit={(detail) => {
          if (extraWicketKind) {
            scoreExtraWicketWithDetail(extraWicketKind, detail);
          } else {
            scoreWicketWithDetail(detail);
          }
        }}
      />

      <p className="text-center text-[11px] leading-relaxed text-zinc-500">
        <Link
          href="/scoreboard"
          className="font-semibold text-emerald-600 underline dark:text-emerald-400"
        >
          Open public scoreboard
        </Link>
        {matchSessionId ? (
          <>
            {" · "}
            <Link
              href={`/match/${matchSessionId}/scoreboard`}
              className="break-all underline decoration-zinc-400"
            >
              /match/{matchSessionId}/scoreboard
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
