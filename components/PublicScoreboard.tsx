"use client";

import { OVERS_PER_PAIR_BLOCK, TIMELINE_VISIBLE } from "@/lib/constants";
import {
  computeOutcome,
  computeWinMargin,
} from "@/lib/match-result";
import {
  currentDisplayInnings,
  derivePublicMode,
} from "@/lib/scoreboard-state";
import {
  bowlingSide,
  maxLegalBalls,
  oversFormat,
  pairPlayerNamesFromIds,
  playerById,
  remainingBatters,
} from "@/lib/scoring";
import { timelineCompactLabel } from "@/lib/event-label";
import { formatWicketDetailed, formatWicketShort } from "@/lib/wicket-format";
import { useMatchStore } from "@/lib/store";
import type { BallEvent, LiveInnings, MatchConfig, Side } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STATUS: Record<string, string> = {
  idle: "No live match",
  setup: "Setup in progress",
  first_innings: "First innings",
  innings_break: "Innings break",
  second_innings: "Second innings",
  completed: "Match completed",
};

function roster(config: MatchConfig, side: Side) {
  return side === "a" ? config.teamA : config.teamB;
}

function lastWicketLine(
  events: BallEvent[],
  config: MatchConfig,
  battingSide: Side
): string | null {
  const w = [...events].reverse().find((e) => e.kind === "wicket");
  if (!w) return null;
  return w.wicket
    ? formatWicketShort(w.wicket, config, battingSide)
    : w.label;
}

function PairTable({
  title,
  inn,
  config,
  battingSide,
}: {
  title: string;
  inn: LiveInnings;
  config: MatchConfig;
  battingSide: Side;
}) {
  const r = roster(config, battingSide);
  const showCurrent =
    inn.currentPairPlayerIds[0] &&
    inn.currentPairPlayerIds[1] &&
    inn.currentPairNumber <= 5;
  const [ca, cb] = showCurrent
    ? pairPlayerNamesFromIds(r, inn.currentPairPlayerIds)
    : ["", ""];
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">
        {title}
      </p>
      <ul className="mt-1 space-y-1 text-sm">
        {inn.completedPairs.map((p) => {
          const [a, b] = pairPlayerNamesFromIds(r, p.playerIds);
          return (
            <li
              key={p.pairNumber}
              className="flex justify-between border-b border-white/10 py-1 last:border-0"
            >
              <span>
                Pair {p.pairNumber}: {a} & {b}
              </span>
              <span className="tabular-nums font-semibold">
                {p.runs} r · {p.wicketEvents} w · {oversFormat(p.legalBalls)} ov
              </span>
            </li>
          );
        })}
        {showCurrent ? (
          <li className="flex justify-between border-b border-emerald-500/30 bg-emerald-950/20 py-2">
            <span>
              <span className="text-emerald-400">Now ·</span> Pair{" "}
              {inn.currentPairNumber}: {ca} & {cb}
            </span>
            <span className="tabular-nums font-semibold text-emerald-200">
              {inn.currentPairRuns} r · {inn.currentPairWicketEvents} w ·{" "}
              {oversFormat(inn.pairBlockLegalBalls)}/{OVERS_PER_PAIR_BLOCK} ov
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function WicketList({
  events,
  config,
  battingSide,
}: {
  events: BallEvent[];
  config: MatchConfig;
  battingSide: Side;
}) {
  const ws = events.filter((e) => e.kind === "wicket");
  if (ws.length === 0) return null;
  return (
    <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm opacity-95">
      {ws.map((e) => (
        <li key={e.id}>
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
  );
}

export function PublicScoreboard() {
  const hydrated = useMatchStore((s) => s.hydrated);
  const phase = useMatchStore((s) => s.phase);
  const config = useMatchStore((s) => s.config);
  const live = useMatchStore((s) => s.live);
  const inningsNumber = useMatchStore((s) => s.inningsNumber);
  const innings1Result = useMatchStore((s) => s.innings1Result);
  const innings2Result = useMatchStore((s) => s.innings2Result);

  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, []);

  const mode = derivePublicMode(phase, config, inningsNumber);
  const displayInn = currentDisplayInnings(
    mode,
    live,
    innings1Result,
    innings2Result
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-400">
        Loading…
      </div>
    );
  }

  if (mode === "idle") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
        <h1 className="text-2xl font-bold">Live Scoreboard</h1>
        <p className="mt-4 text-lg text-zinc-400">
          No live match available
        </p>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          Start a match on the scorer device, then open this page on any screen
          linked to the same browser profile (or another tab on the same
          device).
        </p>
        {!fullscreen && (
          <Link
            href="/"
            className="mt-8 text-sm font-semibold text-emerald-400 underline"
          >
            Home
          </Link>
        )}
      </div>
    );
  }

  if (mode === "setup" || !config) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-100">
        <h1 className="text-2xl font-bold">Live Scoreboard</h1>
        <p className="mt-4 text-lg text-zinc-400">Match setup in progress</p>
        <p className="mt-2 text-sm text-zinc-500">
          The score will appear here once the match has started.
        </p>
        {!fullscreen && (
          <Link
            href="/"
            className="mt-8 text-sm font-semibold text-emerald-400 underline"
          >
            Home
          </Link>
        )}
      </div>
    );
  }

  const teamAv = config.teamA.name;
  const teamBv = config.teamB.name;
  const tossW =
    config.tossWinner === "a" ? teamAv : teamBv;
  const batFirstN =
    config.batFirst === "a" ? teamAv : teamBv;

  /** Live or primary innings row for big score */
  const scoreInn: LiveInnings | null =
    mode === "completed"
      ? innings2Result ?? innings1Result
      : mode === "innings_break"
        ? innings1Result
        : live;

  const battingSideForMain: Side | null =
    mode === "completed" && innings2Result
      ? innings2Result.battingSide
      : mode === "innings_break" && innings1Result
        ? bowlingSide(innings1Result.battingSide)
        : live
          ? live.battingSide
          : null;

  const bowlSideMain =
    battingSideForMain != null
      ? bowlingSide(battingSideForMain)
      : ("a" as Side);

  const mainBatName =
    battingSideForMain != null
      ? battingSideForMain === "a"
        ? teamAv
        : teamBv
      : "—";
  const mainBowlName =
    battingSideForMain != null
      ? bowlSideMain === "a"
        ? teamAv
        : teamBv
      : "—";

  const runs = scoreInn?.runs ?? 0;
  const wkts = scoreInn?.wicketEvents ?? 0;
  const balls = scoreInn?.legalBalls ?? 0;
  const pen = scoreInn?.wicketPenaltyRuns ?? 0;
  const cap = maxLegalBalls(config.maxOvers);
  const ballsLeft = Math.max(0, cap - balls);

  const completedDual =
    mode === "completed" && innings1Result && innings2Result
      ? {
          firstBat: innings1Result.battingSide,
          firstRuns: innings1Result.runs,
          firstWk: innings1Result.wicketEvents,
          secondRuns: innings2Result.runs,
          secondWk: innings2Result.wicketEvents,
        }
      : null;

  const strikerLine = (() => {
    if (
      !live ||
      live.currentPairNumber > 5 ||
      !live.currentPairPlayerIds[0] ||
      !live.currentPairPlayerIds[1]
    ) {
      return { s: "—", ns: "—" };
    }
    const r = roster(config, live.battingSide);
    const [p1, p2] = pairPlayerNamesFromIds(r, live.currentPairPlayerIds);
    return live.strikerIsFirst
      ? { s: p1, ns: p2 }
      : { s: p2, ns: p1 };
  })();

  const remainingLive =
    live && mode !== "innings_break"
      ? remainingBatters(roster(config, live.battingSide), live)
      : [];

  const bowlerName =
    live && battingSideForMain != null
      ? live.currentBowlerPlayerId
        ? playerById(roster(config, bowlSideMain), live.currentBowlerPlayerId)
        : "—"
      : "—";

  const eventsForFeed: BallEvent[] =
    mode === "completed"
      ? [
          ...(innings1Result?.events ?? []),
          ...(innings2Result?.events ?? []),
        ]
      : mode === "innings_break"
        ? innings1Result?.events ?? []
        : live?.events ?? [];

  const battingSideForWicket: Side =
    live?.battingSide ??
    innings2Result?.battingSide ??
    innings1Result?.battingSide ??
    config.batFirst;

  const lastWkt = lastWicketLine(eventsForFeed, config, battingSideForWicket);

  const target =
    innings1Result != null ? innings1Result.runs + 1 : null;
  const need =
    live && innings1Result != null && mode === "second_innings"
      ? Math.max(0, target! - live.runs)
      : null;

  const outcome =
    mode === "completed" && innings1Result && innings2Result
      ? computeOutcome(config, innings1Result, innings2Result)
      : null;
  const margin =
    mode === "completed" && innings1Result && innings2Result
      ? computeWinMargin(innings1Result, innings2Result)
      : null;

  const fsChrome = fullscreen ? "hidden" : "";

  return (
    <div
      className={`min-h-dvh bg-zinc-950 text-zinc-50 ${
        fullscreen ? "px-3 py-4" : ""
      }`}
    >
      <div
        className={`sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 py-2 backdrop-blur ${fsChrome}`}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Live Scoreboard
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold text-white"
            >
              {fullscreen ? "Exit full" : "Fullscreen"}
            </button>
            {!fullscreen && (
              <Link
                href="/"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-zinc-300"
              >
                Home
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-3 py-4 pb-16">
        <header className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Match
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-4xl">
            {teamAv}{" "}
            <span className="font-bold text-zinc-500">v</span> {teamBv}
          </h1>
          {completedDual ? (
            <div className="mt-3 grid grid-cols-2 gap-4 px-2">
              <div className="rounded-xl bg-white/5 py-3">
                <p className="text-xs uppercase text-zinc-500">
                  {completedDual.firstBat === "a" ? teamAv : teamBv}
                </p>
                <p className="mt-1 text-4xl font-black tabular-nums text-white">
                  {completedDual.firstRuns}
                  <span className="text-2xl font-bold text-zinc-500">
                    /{completedDual.firstWk}
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-white/5 py-3">
                <p className="text-xs uppercase text-zinc-500">
                  {completedDual.firstBat === "a" ? teamBv : teamAv}
                </p>
                <p className="mt-1 text-4xl font-black tabular-nums text-white">
                  {completedDual.secondRuns}
                  <span className="text-2xl font-bold text-zinc-500">
                    /{completedDual.secondWk}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-5xl">
                {runs}
                <span className="text-2xl font-bold text-zinc-500 sm:text-4xl">
                  {" "}
                  / {wkts} wkts
                </span>
              </h1>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-200 sm:text-4xl">
                {oversFormat(balls)}{" "}
                <span className="text-lg text-zinc-500 sm:text-2xl">ov</span>
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {ballsLeft} balls left · Wicket penalties: {pen} runs
              </p>
            </>
          )}
          <div className="mt-3 inline-block rounded-full border border-emerald-500/40 bg-emerald-950/50 px-4 py-1.5 text-sm font-bold text-emerald-300">
            {STATUS[mode] ?? mode}
          </div>
        </header>

        {mode !== "completed" && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-zinc-500">
              Current innings
            </p>
            <p className="mt-2 text-center text-lg font-bold text-white">
              Batting: {mainBatName}
            </p>
            <p className="text-center text-sm text-zinc-400">
              Fielding: {mainBowlName}
            </p>
            {mode === "second_innings" && target != null && (
              <p className="mt-3 rounded-xl bg-amber-500/15 px-3 py-2 text-center text-sm font-bold text-amber-200">
                Target {target} to win
                {need != null && (
                  <>
                    {" "}
                    · Need {need} run{need === 1 ? "" : "s"}
                  </>
                )}
                {" · "}
                {ballsLeft} balls left
              </p>
            )}
            {mode === "innings_break" && innings1Result && target != null && (
              <p className="mt-3 rounded-xl bg-amber-500/15 px-3 py-2 text-center text-sm font-bold text-amber-200">
                Next innings target {target} to win · Tie on{" "}
                {innings1Result.runs}
              </p>
            )}
            {live &&
              live.currentPairNumber <= 5 &&
              mode !== "innings_break" && (
              <>
                <p className="mt-4 text-center text-sm text-zinc-400">
                  {live.awaitingNextPairSelection
                    ? `Select pair ${live.currentPairNumber}`
                    : `Pair ${live.currentPairNumber} of 5`}
                </p>
                <div className="mt-2 grid gap-2 text-center text-base">
                  <p>
                    <span className="text-zinc-500">Striker:</span>{" "}
                    <span className="font-bold text-white">{strikerLine.s}</span>
                  </p>
                  <p>
                    <span className="text-zinc-500">Non-striker:</span>{" "}
                    <span className="font-bold text-white">{strikerLine.ns}</span>
                  </p>
                  <p>
                    <span className="text-zinc-500">Bowler:</span>{" "}
                    <span className="font-bold text-white">{bowlerName}</span>
                  </p>
                </div>
                {live.awaitingBowlerSelection ? (
                  <p className="mt-2 text-center text-sm font-semibold text-amber-200">
                    Over complete — scorer is selecting the next bowler
                  </p>
                ) : null}
                {!live.awaitingNextPairSelection &&
                  remainingLive.length > 0 && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-left">
                      <p className="text-xs font-bold uppercase text-zinc-500">
                        Yet to bat
                      </p>
                      <ul className="mt-2 text-sm text-zinc-300">
                        {remainingLive.map((p) => (
                          <li key={p.id}>{p.name || "Unnamed"}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </>
            )}
            {mode === "innings_break" && (
              <p className="mt-4 text-center text-sm text-zinc-400">
                First innings complete. Second innings starts from the scorer
                app.
              </p>
            )}
          </section>
        )}

        {lastWkt && (
          <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-red-300">
              Last wicket
            </p>
            <p className="mt-1 text-lg font-bold text-red-100">{lastWkt}</p>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Recent deliveries
          </p>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-sm">
            {eventsForFeed.length === 0 ? (
              <li className="text-zinc-500">No balls yet.</li>
            ) : (
              eventsForFeed
                .slice(-TIMELINE_VISIBLE)
                .reverse()
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex justify-between gap-2 border-b border-white/5 pb-2"
                  >
                    <span className="font-medium">{timelineCompactLabel(e)}</span>
                    <span className="shrink-0 tabular-nums text-zinc-500">
                      {e.totalAfter}/{oversFormat(e.legalBallsAfter)}
                    </span>
                  </li>
                ))
            )}
          </ul>
        </section>

        {mode !== "completed" &&
          (() => {
            const innForPairs =
              mode === "innings_break" ? innings1Result : displayInn;
            const sideForPairs =
              mode === "innings_break" && innings1Result
                ? innings1Result.battingSide
                : battingSideForMain;
            if (!innForPairs || sideForPairs == null) return null;
            const title =
              mode === "innings_break"
                ? `${
                    innings1Result!.battingSide === "a" ? teamAv : teamBv
                  } (1st innings)`
                : `${mainBatName} batting`;
            return (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Pair scores
                </p>
                <PairTable
                  title={title}
                  inn={innForPairs}
                  config={config}
                  battingSide={sideForPairs}
                />
              </section>
            );
          })()}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
          <p>
            <span className="text-zinc-500">Toss:</span>{" "}
            <strong className="text-white">{tossW}</strong> won
          </p>
          <p className="mt-1">
            <span className="text-zinc-500">Bat first:</span>{" "}
            <strong className="text-white">{batFirstN}</strong>
          </p>
          <p className="mt-1 text-zinc-500">
            {config.maxOvers} overs per innings · Pair cricket (−5 per wicket
            event)
          </p>
        </section>

        {mode === "completed" && innings1Result && innings2Result && (
          <section className="space-y-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/20 p-4">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-emerald-300">
              Final result
            </p>
            <p className="text-center text-2xl font-black text-white">
              {outcome?.headline}
            </p>
            <p className="text-center text-sm text-emerald-100/90">
              {outcome?.detail}
            </p>
            <p className="text-center text-base font-bold text-emerald-200">
              {margin}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-xs font-bold uppercase text-zinc-500">
                  1st innings
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {innings1Result.battingSide === "a" ? teamAv : teamBv}:{" "}
                  {innings1Result.runs}/{innings1Result.wicketEvents}
                </p>
                <p className="text-sm text-zinc-400">
                  {oversFormat(innings1Result.legalBalls)} ov · penalties{" "}
                  {innings1Result.wicketPenaltyRuns}
                </p>
                <PairTable
                  title="Pairs"
                  inn={innings1Result}
                  config={config}
                  battingSide={innings1Result.battingSide}
                />
                <p className="mt-2 text-xs font-bold uppercase text-zinc-500">
                  Wickets
                </p>
                <WicketList
                  events={innings1Result.events}
                  config={config}
                  battingSide={innings1Result.battingSide}
                />
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-xs font-bold uppercase text-zinc-500">
                  2nd innings
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {innings2Result.battingSide === "a" ? teamAv : teamBv}:{" "}
                  {innings2Result.runs}/{innings2Result.wicketEvents}
                </p>
                <p className="text-sm text-zinc-400">
                  {oversFormat(innings2Result.legalBalls)} ov · penalties{" "}
                  {innings2Result.wicketPenaltyRuns}
                </p>
                <PairTable
                  title="Pairs"
                  inn={innings2Result}
                  config={config}
                  battingSide={innings2Result.battingSide}
                />
                <p className="mt-2 text-xs font-bold uppercase text-zinc-500">
                  Wickets
                </p>
                <WicketList
                  events={innings2Result.events}
                  config={config}
                  battingSide={innings2Result.battingSide}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
