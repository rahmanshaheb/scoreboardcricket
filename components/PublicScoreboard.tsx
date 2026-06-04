"use client";

import { OVERS_PER_PAIR_BLOCK } from "@/lib/constants";
import {
  computePlayerBattingStats,
  strikerPlayerId,
} from "@/lib/batting-stats";
import {
  currentDisplayInnings,
  derivePublicMode,
} from "@/lib/scoreboard-state";
import {
  bowlingSide,
  ensureBowlerFigure,
  oversFormat,
  pairPlayerNamesFromIds,
  playerById,
} from "@/lib/scoring";
import { useMatchStore } from "@/lib/store";
import type { LiveInnings, MatchConfig, Side } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function roster(config: MatchConfig, side: Side) {
  return side === "a" ? config.teamA : config.teamB;
}

function PairRuns({ inn, config, battingSide }: {
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
    <ul className="mt-2 space-y-2 text-sm">
      {inn.completedPairs.map((p) => {
        const [a, b] = pairPlayerNamesFromIds(r, p.playerIds);
        return (
          <li
            key={p.pairNumber}
            className="flex justify-between border-b border-white/10 py-2 last:border-0"
          >
            <span className="text-zinc-300">
              Pair {p.pairNumber}: {a} & {b}
            </span>
            <span className="tabular-nums text-lg font-bold text-white">
              {p.runs}
            </span>
          </li>
        );
      })}
      {showCurrent ? (
        <li className="flex justify-between rounded-lg bg-emerald-950/40 px-2 py-2">
          <span className="text-emerald-200">
            Pair {inn.currentPairNumber}: {ca} & {cb}
          </span>
          <span className="tabular-nums text-lg font-bold text-emerald-100">
            {inn.currentPairRuns}
          </span>
        </li>
      ) : null}
    </ul>
  );
}

function PlayerRunsTable({
  inn,
  config,
  battingSide,
}: {
  inn: LiveInnings;
  config: MatchConfig;
  battingSide: Side;
}) {
  const r = roster(config, battingSide);
  const lines = computePlayerBattingStats(inn, r);
  const striker = strikerPlayerId(inn);

  if (lines.length === 0) {
    return <p className="mt-2 text-sm text-zinc-500">No batters yet.</p>;
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {lines.map((p) => (
        <li
          key={p.playerId}
          className={`flex justify-between rounded-lg px-2 py-2 ${
            p.playerId === striker
              ? "bg-emerald-950/50 ring-1 ring-emerald-500/40"
              : "bg-black/20"
          }`}
        >
          <span
            className={
              p.playerId === striker
                ? "font-bold text-emerald-100"
                : "text-zinc-200"
            }
          >
            {p.name}
            {p.playerId === striker ? (
              <span className="ml-1 text-xs text-emerald-400">*</span>
            ) : null}
          </span>
          <span className="tabular-nums font-bold text-white">
            {p.runs}{" "}
            <span className="text-sm font-semibold text-zinc-500">
              ({p.balls}b)
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function BowlerState({
  inn,
  config,
  fieldingSide,
}: {
  inn: LiveInnings;
  config: MatchConfig;
  fieldingSide: Side;
}) {
  const r = roster(config, fieldingSide);
  const currentId = inn.currentBowlerPlayerId;
  const currentName = currentId
    ? playerById(r, currentId)
    : "—";

  const withFigures = r.players
    .map((p) => ({
      id: p.id,
      name: p.name || "?",
      fig: ensureBowlerFigure(inn.bowlerFigures, p.id),
    }))
    .filter(
      (x) =>
        x.fig.legalBallsBowled > 0 ||
        x.fig.runsConceded > 0 ||
        x.fig.wickets > 0 ||
        x.id === currentId
    );

  return (
    <div className="mt-2 space-y-3">
      <div className="rounded-lg bg-violet-950/40 px-3 py-2 text-center">
        <p className="text-xs uppercase tracking-wider text-violet-300">
          Bowling now
        </p>
        <p className="mt-1 text-xl font-bold text-white">{currentName}</p>
        {inn.awaitingBowlerSelection ? (
          <p className="mt-1 text-xs text-amber-200">Over complete — change bowler</p>
        ) : null}
      </div>
      {withFigures.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {withFigures.map((b) => (
            <li
              key={b.id}
              className={`flex flex-wrap justify-between gap-2 rounded-lg px-2 py-2 ${
                b.id === currentId
                  ? "bg-violet-950/30 ring-1 ring-violet-500/30"
                  : "bg-black/20"
              }`}
            >
              <span className="font-semibold text-zinc-200">{b.name}</span>
              <span className="tabular-nums text-zinc-400">
                {oversFormat(b.fig.legalBallsBowled)} ov · {b.fig.runsConceded}r ·{" "}
                {b.fig.wickets}w
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No bowling figures yet.</p>
      )}
    </div>
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
        <h1 className="text-2xl font-bold">Live scoreboard</h1>
        <p className="mt-4 text-lg text-zinc-400">No live match</p>
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
        <h1 className="text-2xl font-bold">Live scoreboard</h1>
        <p className="mt-4 text-lg text-zinc-400">Match not started yet</p>
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

  const scoreInn: LiveInnings | null =
    mode === "completed"
      ? innings2Result ?? innings1Result
      : mode === "innings_break"
        ? innings1Result
        : live;

  const battingSide: Side | null =
    mode === "completed" && innings2Result
      ? innings2Result.battingSide
      : mode === "innings_break" && innings1Result
        ? innings1Result.battingSide
        : live
          ? live.battingSide
          : null;

  const fieldingSide =
    battingSide != null ? bowlingSide(battingSide) : ("a" as Side);

  const batName =
    battingSide === "a" ? teamAv : battingSide === "b" ? teamBv : "—";

  const runs = scoreInn?.runs ?? 0;
  const balls = scoreInn?.legalBalls ?? 0;

  const innForDetail =
    mode === "innings_break" ? innings1Result : displayInn;

  const fsChrome = fullscreen ? "hidden" : "";

  return (
    <div
      className={`min-h-dvh bg-zinc-950 text-zinc-50 ${
        fullscreen ? "px-2 py-3" : ""
      }`}
    >
      <div
        className={`sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 py-2 backdrop-blur ${fsChrome}`}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-2">
          <span className="truncate text-sm font-bold text-emerald-400">
            {batName}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold"
            >
              {fullscreen ? "Exit" : "Full"}
            </button>
            {!fullscreen && (
              <Link
                href="/"
                className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-zinc-400"
              >
                Home
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-3 py-4 pb-12">
        <header className="rounded-2xl border border-white/10 bg-white/5 py-6 text-center">
          <p className="text-5xl font-black tabular-nums tracking-tight text-white sm:text-7xl">
            {runs}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
            Runs
          </p>
          <p className="mt-4 font-mono text-4xl font-bold tabular-nums text-emerald-300 sm:text-5xl">
            {oversFormat(balls)}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
            Overs
          </p>
          {mode === "completed" && innings1Result && innings2Result && (
            <p className="mt-4 text-sm text-zinc-400">
              1st: {innings1Result.runs} ({oversFormat(innings1Result.legalBalls)}{" "}
              ov) · 2nd: {innings2Result.runs} (
              {oversFormat(innings2Result.legalBalls)} ov)
            </p>
          )}
        </header>

        {innForDetail && battingSide != null && (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Pair runs
              </h2>
              <PairRuns
                inn={innForDetail}
                config={config}
                battingSide={battingSide}
              />
              {innForDetail.currentPairNumber <= 5 &&
                !innForDetail.awaitingNextPairSelection && (
                  <p className="mt-2 text-center text-xs text-zinc-500">
                    Pair block: {oversFormat(innForDetail.pairBlockLegalBalls)}/
                    {OVERS_PER_PAIR_BLOCK} ov
                  </p>
                )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Batters
              </h2>
              <PlayerRunsTable
                inn={innForDetail}
                config={config}
                battingSide={battingSide}
              />
            </section>
          </>
        )}

        {live && mode !== "innings_break" && mode !== "completed" && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Bowlers
            </h2>
            <BowlerState inn={live} config={config} fieldingSide={fieldingSide} />
          </section>
        )}
      </div>
    </div>
  );
}
