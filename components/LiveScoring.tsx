"use client";

import {
  LEGAL_BALLS_PER_PAIR_BLOCK,
  OVERS_PER_PAIR_BLOCK,
  TIMELINE_VISIBLE,
} from "@/lib/constants";
import { BowlerSelectModal } from "@/components/BowlerSelectModal";
import { QuickOutSheet, type QuickOutMode } from "@/components/QuickOutSheet";
import { SelectNextPairModal } from "@/components/SelectNextPairModal";
import { timelineCompactLabel } from "@/lib/event-label";
import {
  bowlingSide,
  makeQuickWicket,
  maxLegalBalls,
  oversFormat,
  pairPlayerNamesFromIds,
  remainingBatters,
} from "@/lib/scoring";
import { formatWicketShort } from "@/lib/wicket-format";
import { validateWicketDetail } from "@/lib/wicket-validate";
import { useMatchStore } from "@/lib/store";
import type { LiveInnings, MatchConfig } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

const RUNS_PAD = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const EXTRA_RUNS_PAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const padBtn =
  "flex min-h-[3.25rem] items-center justify-center rounded-2xl text-lg font-bold shadow-sm active:scale-[0.97] disabled:opacity-40";
const runBtn = `${padBtn} bg-zinc-900 text-white dark:bg-emerald-700`;
const extraBtn = `${padBtn} border-2 border-violet-400 bg-violet-50 text-violet-950 dark:border-violet-600 dark:bg-violet-950/60 dark:text-violet-100`;
const outBtn = `${padBtn} border-2 border-red-400 bg-red-50 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100`;

function CompactHeader({
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
  const batName = bat === "a" ? config.teamA.name : config.teamB.name;
  const roster = bat === "a" ? config.teamA : config.teamB;
  const cap = maxLegalBalls(config.maxOvers);
  const [p1, p2] = pairPlayerNamesFromIds(roster, live.currentPairPlayerIds);
  const striker = live.strikerIsFirst ? p1 : p2;

  return (
    <div className="sticky top-14 z-30 -mx-4 border-b border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Inn {inningsNumber} · {batName}
          </p>
          <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
            {live.awaitingNextPairSelection
              ? "Pick next pair"
              : live.awaitingBowlerSelection
                ? "Pick bowler"
                : `Pair ${live.currentPairNumber}/5 · ${striker}*`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-black tabular-nums leading-none">
            {live.runs}
            <span className="text-lg font-bold text-zinc-400">
              /{live.wicketEvents}
            </span>
          </p>
          <p className="mt-1 text-xs tabular-nums text-zinc-500">
            {oversFormat(live.legalBalls)} · {cap - live.legalBalls} left
          </p>
        </div>
      </div>
      {inningsNumber === 2 && firstInningsRuns !== null && (
        <p className="mt-2 text-center text-xs font-semibold text-amber-800 dark:text-amber-300">
          Need {firstInningsRuns + 1} to win
        </p>
      )}
      {live.awaitingBowlerSelection && !live.awaitingNextPairSelection && (
        <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-center text-xs font-bold text-amber-950 dark:bg-amber-900/40 dark:text-amber-100">
          Over done — choose next bowler
        </p>
      )}
      {!live.awaitingNextPairSelection &&
        live.currentPairNumber <= 5 &&
        p1 !== "—" && (
          <p className="mt-2 text-center text-xs tabular-nums text-zinc-500">
            Pair: {live.currentPairRuns}r · {oversFormat(live.pairBlockLegalBalls)}/
            {OVERS_PER_PAIR_BLOCK}ov ({live.pairBlockLegalBalls}/
            {LEGAL_BALLS_PER_PAIR_BLOCK}b)
          </p>
        )}
    </div>
  );
}

function Timeline({ live }: { live: LiveInnings }) {
  const tail = live.events.slice(-TIMELINE_VISIBLE).reverse();
  if (tail.length === 0) return null;
  return (
    <ul className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      {tail.map((e) => (
        <li key={e.id} className="flex justify-between gap-2 text-zinc-700 dark:text-zinc-300">
          <span>{timelineCompactLabel(e)}</span>
          <span className="shrink-0 tabular-nums text-zinc-500">
            {e.totalAfter}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LiveScoring() {
  const [quickOutMode, setQuickOutMode] = useState<QuickOutMode | null>(null);
  const [extraType, setExtraType] = useState<"wide" | "no_ball">("wide");
  const [pairModalError, setPairModalError] = useState<string | null>(null);
  const [bowlerModalError, setBowlerModalError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const config = useMatchStore((s) => s.config);
  const live = useMatchStore((s) => s.live);
  const inningsNumber = useMatchStore((s) => s.inningsNumber);
  const innings1Result = useMatchStore((s) => s.innings1Result);
  const undoStack = useMatchStore((s) => s.undoStack);
  const matchSessionId = useMatchStore((s) => s.matchSessionId);

  const scoreRuns = useMatchStore((s) => s.scoreRuns);
  const scoreWide = useMatchStore((s) => s.scoreWide);
  const scoreNoBall = useMatchStore((s) => s.scoreNoBall);
  const scoreWicketWithDetail = useMatchStore((s) => s.scoreWicketWithDetail);
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
  const swapStrikerManually = useMatchStore((s) => s.swapStrikerManually);
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

  const bowlSide = bowlingSide(live.battingSide);
  const bowlingRoster = bowlSide === "a" ? config.teamA : config.teamB;
  const bowlerValue =
    live.currentBowlerPlayerId ?? bowlingRoster.players[0]?.id ?? "";

  const bowlerSelectLocked =
    live.awaitingBowlerSelection ||
    live.awaitingNextPairSelection ||
    (live.legalBalls % 6 !== 0 && live.legalBalls > 0);

  const submitQuickOut = (
    detail: Parameters<typeof scoreWicketWithDetail>[0],
    extraDelivery?: "wide" | "no_ball"
  ) => {
    if (extraDelivery) {
      scoreExtraWicketWithDetail(extraDelivery, detail);
    } else {
      scoreWicketWithDetail(detail);
    }
  };

  const tapInstantOut = (dismissal: "bowled" | "stumped") => {
    const payload = makeQuickWicket(live, dismissal);
    if (!payload) return;
    const err = validateWicketDetail(payload, config, live.battingSide);
    if (err) return;
    scoreWicketWithDetail(payload);
  };

  const pickExtra = (n: number) => {
    const additional = n - 1;
    if (extraType === "wide") scoreWide(additional);
    else scoreNoBall(additional);
  };

  return (
    <div className="space-y-3 pb-4">
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

      <SelectNextPairModal
        open={live.awaitingNextPairSelection}
        remaining={remaining}
        pairNumber={live.currentPairNumber}
        error={pairModalError}
        onSubmit={(a, b) => {
          setPairModalError(null);
          const err = submitNextPairSelection([a, b]);
          setPairModalError(err);
        }}
      />

      <QuickOutSheet
        open={quickOutMode != null}
        mode={quickOutMode}
        onClose={() => setQuickOutMode(null)}
        config={config}
        live={live}
        onSubmit={submitQuickOut}
      />

      <CompactHeader
        config={config}
        live={live}
        inningsNumber={inningsNumber}
        firstInningsRuns={firstRuns}
      />

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={!canDeliver}
          onClick={() => swapStrikerManually()}
          className="min-h-11 rounded-xl border border-emerald-500 text-sm font-bold text-emerald-800 disabled:opacity-40 dark:text-emerald-300"
        >
          Swap ends
        </button>
        <select
          aria-label="Bowler"
          className="min-h-11 rounded-xl border border-zinc-300 bg-white px-2 text-sm font-semibold dark:border-zinc-600 dark:bg-zinc-800"
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
      </div>

      <section aria-label="Runs">
        <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          Runs
        </h2>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {RUNS_PAD.map((n) => (
            <button
              key={n}
              type="button"
              disabled={!canLegalDelivery}
              onClick={() => scoreRuns(n)}
              className={runBtn}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Extra runs">
        <div className="mb-1.5 flex gap-1.5">
          <button
            type="button"
            onClick={() => setExtraType("wide")}
            className={`min-h-10 flex-1 rounded-xl text-sm font-bold ${
              extraType === "wide"
                ? "bg-violet-600 text-white"
                : "border border-zinc-300 dark:border-zinc-600"
            }`}
          >
            Wide
          </button>
          <button
            type="button"
            onClick={() => setExtraType("no_ball")}
            className={`min-h-10 flex-1 rounded-xl text-sm font-bold ${
              extraType === "no_ball"
                ? "bg-orange-600 text-white"
                : "border border-zinc-300 dark:border-zinc-600"
            }`}
          >
            No ball
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {EXTRA_RUNS_PAD.map((n) => (
            <button
              key={n}
              type="button"
              disabled={!canLegalDelivery}
              onClick={() => pickExtra(n)}
              className={
                extraType === "wide"
                  ? extraBtn
                  : `${padBtn} border-2 border-orange-400 bg-orange-50 text-orange-950 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-100`
              }
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 text-center text-[10px] text-zinc-500">
          Total runs on this extra (incl. 1 for {extraType === "wide" ? "wide" : "no ball"})
        </p>
      </section>

      <section aria-label="Out">
        <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          Out
        </h2>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            disabled={!canLegalDelivery}
            onClick={() => tapInstantOut("bowled")}
            className={`${outBtn} text-xs`}
          >
            Bowled
          </button>
          <button
            type="button"
            disabled={!canLegalDelivery}
            onClick={() => setQuickOutMode("caught")}
            className={`${outBtn} text-xs`}
          >
            Caught
          </button>
          <button
            type="button"
            disabled={!canDeliver}
            onClick={() => setQuickOutMode("run_out")}
            className={`${outBtn} text-xs`}
          >
            Run out
          </button>
          <button
            type="button"
            disabled={!canLegalDelivery}
            onClick={() => tapInstantOut("stumped")}
            className={`${outBtn} text-xs`}
          >
            Stumped
          </button>
        </div>
        <button
          type="button"
          disabled={!canDeliver}
          onClick={() => setQuickOutMode("extra_wicket")}
          className={`${outBtn} mt-1.5 w-full`}
        >
          Wide / No ball out
        </button>
      </section>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => undo()}
          disabled={undoStack.length === 0}
          className="min-h-11 rounded-xl border border-zinc-300 text-sm font-semibold disabled:opacity-40 dark:border-zinc-600"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!canLegalDelivery}
          onClick={() => scoreEndOver()}
          className="min-h-11 rounded-xl border border-zinc-300 text-sm font-semibold disabled:opacity-40 dark:border-zinc-600"
        >
          End over
        </button>
      </div>

      <button
        type="button"
        onClick={() => endInningsManually()}
        className="min-h-10 w-full rounded-xl text-xs font-semibold text-zinc-500 underline"
      >
        End innings now
      </button>

      <Timeline live={live} />

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="w-full text-center text-xs font-semibold text-zinc-500"
      >
        {showMore ? "Hide details" : "More details"}
      </button>

      {showMore && (
        <div className="space-y-3 text-sm">
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
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
                Last wicket: {line}
              </p>
            );
          })()}
          <Link
            href="/scoreboard"
            className="block text-center text-xs font-semibold text-emerald-600 underline dark:text-emerald-400"
          >
            Open live scoreboard
          </Link>
          {matchSessionId ? (
            <Link
              href={`/match/${matchSessionId}/scoreboard`}
              className="block break-all text-center text-xs underline text-zinc-500"
            >
              Share: /match/{matchSessionId}/scoreboard
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
