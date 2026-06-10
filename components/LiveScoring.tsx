"use client";

import {
  LAST_BALLS_VISIBLE,
  OVERS_PER_PAIR_BLOCK,
  RUNS_PAD,
  TIMELINE_VISIBLE,
} from "@/lib/constants";
import { BallEditSheet } from "@/components/BallEditSheet";
import { BowlerSelectModal } from "@/components/BowlerSelectModal";
import { QuickOutSheet, type QuickOutMode } from "@/components/QuickOutSheet";
import { SelectNextPairModal } from "@/components/SelectNextPairModal";
import { lastDeliveryEvents } from "@/lib/ball-history";
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
import type { BallEvent, LiveInnings, MatchConfig } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

const EXTRA_RUNS_PAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const padBtn =
  "flex h-9 items-center justify-center rounded-lg text-sm font-bold shadow-sm active:scale-[0.97] disabled:opacity-40";
const runBtn = `${padBtn} bg-zinc-900 text-white dark:bg-emerald-700`;
const extraBtn = `${padBtn} border border-violet-400 bg-violet-50 text-violet-950 dark:border-violet-600 dark:bg-violet-950/60 dark:text-violet-100`;
const outBtn = `${padBtn} border border-red-400 bg-red-50 text-[11px] text-red-900 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100`;
const actionBtn =
  "h-8 rounded-lg border border-zinc-300 text-xs font-semibold disabled:opacity-40 dark:border-zinc-600";

function ballChipClass(kind: BallEvent["kind"]): string {
  switch (kind) {
    case "wicket":
      return "border-red-500/60 bg-red-950/50 text-red-200";
    case "wide":
      return "border-violet-500/60 bg-violet-950/50 text-violet-200";
    case "no_ball":
      return "border-orange-500/60 bg-orange-950/50 text-orange-200";
    case "end_over":
      return "border-zinc-500/60 bg-zinc-800 text-zinc-300";
    default:
      return "border-zinc-600 bg-zinc-900 text-zinc-100";
  }
}

function LastSixBalls({
  events,
  disabled,
  onSelect,
}: {
  events: BallEvent[];
  disabled: boolean;
  onSelect: (e: BallEvent) => void;
}) {
  const balls = lastDeliveryEvents(events, LAST_BALLS_VISIBLE);
  const pad = LAST_BALLS_VISIBLE - balls.length;
  const slots: (BallEvent | null)[] = [
    ...Array(Math.max(0, pad)).fill(null),
    ...balls,
  ];

  return (
    <div className="mt-1 grid grid-cols-12 gap-0.5">
      {slots.map((e, i) =>
        e ? (
          <button
            key={e.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(e)}
            className={`flex h-6 min-w-0 items-center justify-center rounded border px-0.5 text-[9px] font-bold tabular-nums leading-none active:scale-95 disabled:opacity-40 ${ballChipClass(e.kind)}`}
            aria-label={`Edit ${timelineCompactLabel(e)}`}
          >
            {timelineCompactLabel(e)}
          </button>
        ) : (
          <div
            key={`empty-${i}`}
            className="h-6 rounded border border-dashed border-zinc-300/60 dark:border-zinc-700/60"
            aria-hidden
          />
        )
      )}
    </div>
  );
}

function CompactHeader({
  config,
  live,
  inningsNumber,
  firstInningsRuns,
  scoringLocked,
  onEditBall,
}: {
  config: MatchConfig;
  live: LiveInnings;
  inningsNumber: 1 | 2;
  firstInningsRuns: number | null;
  scoringLocked: boolean;
  onEditBall: (e: BallEvent) => void;
}) {
  const bat = live.battingSide;
  const batName = bat === "a" ? config.teamA.name : config.teamB.name;
  const roster = bat === "a" ? config.teamA : config.teamB;
  const [p1, p2] = pairPlayerNamesFromIds(roster, live.currentPairPlayerIds);
  const striker = live.strikerIsFirst ? p1 : p2;

  return (
    <div className="shrink-0 border-b border-zinc-200 pb-1.5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            Inn {inningsNumber} · {batName}
          </p>
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            {live.awaitingNextPairSelection
              ? "Pick next pair"
              : live.awaitingBowlerSelection
                ? "Pick bowler"
                : `Pair ${live.currentPairNumber}/5 · ${striker}*`}
          </p>
          {!live.awaitingNextPairSelection &&
            live.currentPairNumber <= 5 &&
            p1 !== "—" && (
              <p className="text-[10px] tabular-nums text-zinc-500">
                {live.currentPairRuns}r · {oversFormat(live.pairBlockLegalBalls)}/
                {OVERS_PER_PAIR_BLOCK}ov
              </p>
            )}
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-baseline justify-end gap-1.5">
            <p className="text-sm font-bold tabular-nums text-zinc-500">
              {oversFormat(live.legalBalls)}
            </p>
            <p className="text-2xl font-black tabular-nums leading-none">
              {live.runs}
            </p>
          </div>
        </div>
      </div>
      <LastSixBalls
        events={live.events}
        disabled={scoringLocked}
        onSelect={onEditBall}
      />
      {inningsNumber === 2 && firstInningsRuns !== null && (
        <p className="mt-1 text-center text-[10px] font-semibold text-amber-800 dark:text-amber-300">
          Need {firstInningsRuns + 1} to win
        </p>
      )}
    </div>
  );
}

function Timeline({ live }: { live: LiveInnings }) {
  const tail = live.events.slice(-TIMELINE_VISIBLE).reverse();
  if (tail.length === 0) return null;
  return (
    <ul className="max-h-24 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1.5 text-[10px] dark:border-zinc-800 dark:bg-zinc-900">
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
  const [editBall, setEditBall] = useState<BallEvent | null>(null);
  const [editBallError, setEditBallError] = useState<string | null>(null);

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
  const editDeliveryAtEvent = useMatchStore((s) => s.editDeliveryAtEvent);
  const swapStrikerManually = useMatchStore((s) => s.swapStrikerManually);
  const endInningsManually = useMatchStore((s) => s.endInningsManually);
  const scoringLocked = useMatchStore((s) => s.scoringLocked);
  const matchSessionIdForLink = useMatchStore((s) => s.matchSessionId);

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
    !scoringLocked &&
    !live.awaitingNextPairSelection &&
    !live.awaitingBowlerSelection &&
    live.currentPairNumber <= 5 &&
    Boolean(live.currentPairPlayerIds[0]) &&
    Boolean(live.currentPairPlayerIds[1]) &&
    live.legalBalls < maxLegalBalls(config.maxOvers);

  const canLegalDelivery =
    canDeliver && Boolean(live.currentBowlerPlayerId) && !scoringLocked;

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

  const boardHref = matchSessionIdForLink
    ? `/match/${matchSessionIdForLink}/scoreboard`
    : "/scoreboard";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
      {scoringLocked ? (
        <p className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          View only —{" "}
          <Link href={boardHref} className="font-bold underline">
            live board
          </Link>
        </p>
      ) : null}

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

      <BallEditSheet
        open={editBall != null}
        event={editBall}
        onClose={() => {
          setEditBall(null);
          setEditBallError(null);
        }}
        onApply={(edit) => {
          if (!editBall) return;
          const ok = editDeliveryAtEvent(editBall.id, edit);
          if (!ok) {
            setEditBallError("Could not edit that ball.");
            return;
          }
          setEditBall(null);
          setEditBallError(null);
        }}
      />

      {editBallError && (
        <p className="mb-2 rounded-lg bg-red-100 px-3 py-2 text-center text-xs font-semibold text-red-900 dark:bg-red-950/50 dark:text-red-200">
          {editBallError}
        </p>
      )}

      <CompactHeader
        config={config}
        live={live}
        inningsNumber={inningsNumber}
        firstInningsRuns={firstRuns}
        scoringLocked={scoringLocked}
        onEditBall={setEditBall}
      />

      <div className="grid shrink-0 grid-cols-2 gap-1">
        <button
          type="button"
          disabled={!canDeliver}
          onClick={() => swapStrikerManually()}
          className={`${actionBtn} border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300`}
        >
          Swap ends
        </button>
        <select
          aria-label="Bowler"
          className={`${actionBtn} bg-white px-1.5 font-semibold dark:bg-zinc-800`}
          value={bowlerValue}
          disabled={bowlerSelectLocked || scoringLocked}
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

      <section aria-label="Runs" className="shrink-0">
        <div className="grid grid-cols-6 gap-1">
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

      <section aria-label="Extra runs" className="shrink-0">
        <div className="mb-1 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setExtraType("wide")}
            className={`h-7 rounded-lg text-xs font-bold ${
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
            className={`h-7 rounded-lg text-xs font-bold ${
              extraType === "no_ball"
                ? "bg-orange-600 text-white"
                : "border border-zinc-300 dark:border-zinc-600"
            }`}
          >
            No ball
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {EXTRA_RUNS_PAD.map((n) => (
            <button
              key={n}
              type="button"
              disabled={!canLegalDelivery}
              onClick={() => pickExtra(n)}
              className={
                extraType === "wide"
                  ? extraBtn
                  : `${padBtn} border border-orange-400 bg-orange-50 text-orange-950 dark:border-orange-700 dark:bg-orange-950/60 dark:text-orange-100`
              }
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Out" className="shrink-0">
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            disabled={!canLegalDelivery}
            onClick={() => tapInstantOut("bowled")}
            className={outBtn}
          >
            Bowled
          </button>
          <button
            type="button"
            disabled={!canLegalDelivery}
            onClick={() => setQuickOutMode("caught")}
            className={outBtn}
          >
            Caught
          </button>
          <button
            type="button"
            disabled={!canDeliver}
            onClick={() => setQuickOutMode("run_out")}
            className={outBtn}
          >
            Run out
          </button>
          <button
            type="button"
            disabled={!canLegalDelivery}
            onClick={() => tapInstantOut("stumped")}
            className={outBtn}
          >
            Stumped
          </button>
          <button
            type="button"
            disabled={!canDeliver}
            onClick={() => setQuickOutMode("extra_wicket")}
            className={outBtn}
          >
            W/N out
          </button>
        </div>
      </section>

      <div className="mt-auto grid shrink-0 grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => undo()}
          disabled={undoStack.length === 0}
          className={actionBtn}
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!canLegalDelivery}
          onClick={() => scoreEndOver()}
          className={actionBtn}
        >
          End over
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="shrink-0 text-center text-[10px] font-semibold text-zinc-500"
      >
        {showMore ? "Hide details" : "More"}
      </button>

      {showMore && (
        <div className="shrink-0 space-y-1.5 overflow-y-auto text-xs">
          <button
            type="button"
            onClick={() => endInningsManually()}
            className="w-full rounded-lg border border-zinc-300 py-1 text-[10px] font-semibold text-zinc-600 dark:border-zinc-600"
          >
            End innings now
          </button>
          <Timeline live={live} />
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
