import { rebuildSnapshotFromArchive } from "@/lib/db/rebuild-snapshot-from-archive";
import { playerNameKey } from "@/lib/db/name-key";
import { prisma } from "@/lib/prisma";
import {
  buildPairLookup,
  replayInningsFromEvents,
} from "@/lib/replay-innings";
import { bowlingSide, oversFormat } from "@/lib/scoring";
import type { LiveInnings, MatchConfig, Side } from "@/lib/types";

export type PlayerStatRow = {
  nameKey: string;
  displayName: string;
  matchesPlayed: number;
  battingRuns: number;
  battingWicketEvents: number;
  ballsBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  catches: number;
  runOuts: number;
  stumpings: number;
};

type Agg = {
  displayName: string;
  matches: Set<string>;
  battingRuns: number;
  battingWicketEvents: number;
  ballsBowled: number;
  runsConceded: number;
  wicketsTaken: number;
  catches: number;
  runOuts: number;
  stumpings: number;
};

function emptyAgg(displayName: string): Agg {
  return {
    displayName,
    matches: new Set(),
    battingRuns: 0,
    battingWicketEvents: 0,
    ballsBowled: 0,
    runsConceded: 0,
    wicketsTaken: 0,
    catches: 0,
    runOuts: 0,
    stumpings: 0,
  };
}

function rosterPlayer(
  config: MatchConfig,
  side: Side,
  playerId: string
): { key: string; name: string } | null {
  const roster = side === "a" ? config.teamA : config.teamB;
  const player = roster.players.find((p) => p.id === playerId);
  if (!player?.name?.trim()) return null;
  const name = player.name.trim();
  return { key: playerNameKey(name), name };
}

function bump(
  map: Map<string, Agg>,
  key: string,
  displayName: string,
  matchId: string,
  patch: Partial<
    Omit<Agg, "displayName" | "matches">
  >
) {
  let row = map.get(key);
  if (!row) {
    row = emptyAgg(displayName);
    map.set(key, row);
  }
  row.matches.add(matchId);
  if (patch.battingRuns) row.battingRuns += patch.battingRuns;
  if (patch.battingWicketEvents) row.battingWicketEvents += patch.battingWicketEvents;
  if (patch.ballsBowled) row.ballsBowled += patch.ballsBowled;
  if (patch.runsConceded) row.runsConceded += patch.runsConceded;
  if (patch.wicketsTaken) row.wicketsTaken += patch.wicketsTaken;
  if (patch.catches) row.catches += patch.catches;
  if (patch.runOuts) row.runOuts += patch.runOuts;
  if (patch.stumpings) row.stumpings += patch.stumpings;
}

function openingPair(inn: LiveInnings): [string, string] | null {
  const open = inn.completedPairs.find((p) => p.pairNumber === 1);
  if (open?.playerIds[0] && open.playerIds[1]) return open.playerIds;
  const first = inn.completedPairs[0];
  if (first?.playerIds[0] && first.playerIds[1]) return first.playerIds;
  return null;
}

function aggregateFielding(
  map: Map<string, Agg>,
  config: MatchConfig,
  inn: LiveInnings,
  matchId: string
) {
  const bowlSide = bowlingSide(inn.battingSide);
  for (const e of inn.events) {
    if (e.kind !== "wicket" || !e.wicket) continue;
    const w = e.wicket;

    if (w.dismissalType === "caught" && w.catcherPlayerId) {
      const p = rosterPlayer(config, bowlSide, w.catcherPlayerId);
      if (p) bump(map, p.key, p.name, matchId, { catches: 1 });
    }

    if (w.dismissalType === "stumped" && w.catcherPlayerId) {
      const p = rosterPlayer(config, bowlSide, w.catcherPlayerId);
      if (p) bump(map, p.key, p.name, matchId, { stumpings: 1 });
    }

    if (w.dismissalType === "run_out") {
      for (const fielderId of w.fielderPlayerIds) {
        const p = rosterPlayer(config, bowlSide, fielderId);
        if (p) bump(map, p.key, p.name, matchId, { runOuts: 1 });
      }
    }
  }
}

function aggregateBowling(
  map: Map<string, Agg>,
  config: MatchConfig,
  inn: LiveInnings,
  replayed: LiveInnings,
  matchId: string
) {
  const bowlSide = bowlingSide(inn.battingSide);
  for (const [playerId, fig] of Object.entries(replayed.bowlerFigures)) {
    if (
      fig.legalBallsBowled === 0 &&
      fig.runsConceded === 0 &&
      fig.wickets === 0
    ) {
      continue;
    }
    const p = rosterPlayer(config, bowlSide, playerId);
    if (!p) continue;
    bump(map, p.key, p.name, matchId, {
      ballsBowled: fig.legalBallsBowled,
      runsConceded: fig.runsConceded,
      wicketsTaken: fig.wickets,
    });
  }
}

function aggregateInnings(
  map: Map<string, Agg>,
  config: MatchConfig,
  inn: LiveInnings,
  inningsNum: 1 | 2,
  matchId: string
) {
  if (inn.events.length > 0) {
    const pairLookup = buildPairLookup(inn);
    const opening = openingPair(inn);
    if (opening) {
      const replayed = replayInningsFromEvents(
        config,
        inningsNum,
        inn.battingSide,
        opening,
        inn.events,
        pairLookup
      );
      aggregateBowling(map, config, inn, replayed, matchId);
    }
    aggregateFielding(map, config, inn, matchId);
  }
}

/** Batting, bowling, and fielding totals across all finished matches. */
export async function getAllPlayerStats(): Promise<PlayerStatRow[]> {
  const [pairs, matches] = await Promise.all([
    prisma.pairScoreRecord.findMany({
      select: {
        matchId: true,
        player1Key: true,
        player1Name: true,
        player2Key: true,
        player2Name: true,
        runs: true,
        wicketEvents: true,
      },
    }),
    prisma.match.findMany({
      include: {
        innings: { orderBy: { inningsNumber: "asc" } },
      },
    }),
  ]);

  const map = new Map<string, Agg>();

  for (const row of pairs) {
    bump(map, row.player1Key, row.player1Name, row.matchId, {
      battingRuns: row.runs,
      battingWicketEvents: row.wicketEvents,
    });
    bump(map, row.player2Key, row.player2Name, row.matchId, {
      battingRuns: row.runs,
      battingWicketEvents: row.wicketEvents,
    });
  }

  for (const match of matches) {
    const snap = rebuildSnapshotFromArchive(match);
    if (!snap) continue;

    const inningsList: [1 | 2, LiveInnings][] = [
      [1, snap.innings1Result!],
      [2, snap.innings2Result!],
    ];

    for (const [num, inn] of inningsList) {
      if (!inn) continue;
      aggregateInnings(map, snap.config, inn, num, match.id);
    }
  }

  return [...map.entries()]
    .map(([nameKey, v]) => ({
      nameKey,
      displayName: v.displayName,
      matchesPlayed: v.matches.size,
      battingRuns: v.battingRuns,
      battingWicketEvents: v.battingWicketEvents,
      ballsBowled: v.ballsBowled,
      runsConceded: v.runsConceded,
      wicketsTaken: v.wicketsTaken,
      catches: v.catches,
      runOuts: v.runOuts,
      stumpings: v.stumpings,
    }))
    .sort(
      (a, b) =>
        b.battingRuns - a.battingRuns ||
        b.wicketsTaken - a.wicketsTaken ||
        a.displayName.localeCompare(b.displayName)
    );
}

export function formatBowlingLine(ballsBowled: number, wickets: number, runs: number): string {
  return `${oversFormat(ballsBowled)} ov · ${wickets} w · ${runs} r`;
}

export function formatFieldingLine(
  catches: number,
  runOuts: number,
  stumpings: number
): string {
  const parts: string[] = [];
  if (catches) parts.push(`${catches} ct`);
  if (runOuts) parts.push(`${runOuts} ro`);
  if (stumpings) parts.push(`${stumpings} st`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}
