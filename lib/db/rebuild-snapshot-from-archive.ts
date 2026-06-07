import type { MatchDbSnapshot } from "@/lib/db/match-snapshot";
import type {
  BallEvent,
  CompletedPairBlock,
  LiveInnings,
  MatchConfig,
  Player,
  Side,
} from "@/lib/types";
import { newId } from "@/lib/id";

type ArchivedInnings = {
  inningsNumber: number;
  battingSide: string;
  runs: number;
  legalBalls: number;
  wicketEvents: number;
  wicketPenaltyRuns: number;
  pairStatsJson: string;
  eventsJson: string | null;
};

type ArchivedMatch = {
  externalId: string | null;
  teamAName: string;
  teamBName: string;
  maxOvers: number;
  tossWinner: string;
  batFirst: string;
  innings: ArchivedInnings[];
};

type PairStatRow = {
  pairNumber: number;
  runs: number;
  wicketEvents: number;
  legalBalls: number;
  batter1: string;
  batter2: string;
};

function playerIdForName(map: Map<string, string>, name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  let id = map.get(trimmed);
  if (!id) {
    id = newId();
    map.set(trimmed, id);
  }
  return id;
}

function playersFromNames(
  names: Iterable<string>,
  nameToId: Map<string, string>
): Player[] {
  return [...names].map((name) => ({
    id: playerIdForName(nameToId, name),
    name: name.trim(),
  }));
}

function inningsFromArchiveRow(
  row: ArchivedInnings,
  nameToId: Map<string, string>
): LiveInnings {
  const pairStats = JSON.parse(row.pairStatsJson) as PairStatRow[];
  const events = row.eventsJson
    ? (JSON.parse(row.eventsJson) as BallEvent[])
    : [];

  const completedPairs: CompletedPairBlock[] = pairStats.map((p) => ({
    pairNumber: p.pairNumber,
    playerIds: [
      playerIdForName(nameToId, p.batter1),
      playerIdForName(nameToId, p.batter2),
    ],
    runs: p.runs,
    wicketEvents: p.wicketEvents,
    legalBalls: p.legalBalls,
  }));

  return {
    battingSide: row.battingSide as Side,
    runs: row.runs,
    legalBalls: row.legalBalls,
    wicketEvents: row.wicketEvents,
    wicketPenaltyRuns: row.wicketPenaltyRuns,
    currentPairNumber: 6,
    currentPairPlayerIds: ["", ""],
    completedPairs,
    pairBlockLegalBalls: 0,
    currentPairRuns: 0,
    currentPairWicketEvents: 0,
    awaitingNextPairSelection: false,
    strikerIsFirst: true,
    awaitingBowlerSelection: false,
    lastCompletedOverBowlerPlayerId: null,
    bowlerFigures: {},
    events,
  };
}

/** Best-effort snapshot from archived Match rows (legacy saves without live session). */
export function rebuildSnapshotFromArchive(
  match: ArchivedMatch
): MatchDbSnapshot | null {
  if (!match.externalId) return null;
  const first = match.innings.find((i) => i.inningsNumber === 1);
  const second = match.innings.find((i) => i.inningsNumber === 2);
  if (!first || !second) return null;

  const nameToId = new Map<string, string>();
  const inn1 = inningsFromArchiveRow(first, nameToId);
  const inn2 = inningsFromArchiveRow(second, nameToId);

  const teamANames = new Set<string>();
  const teamBNames = new Set<string>();
  for (const row of match.innings) {
    const target = row.battingSide === "a" ? teamANames : teamBNames;
    const pairs = JSON.parse(row.pairStatsJson) as PairStatRow[];
    for (const p of pairs) {
      if (p.batter1) target.add(p.batter1.trim());
      if (p.batter2) target.add(p.batter2.trim());
    }
  }

  const mkRoster = (names: Set<string>): Player[] => {
    const list = playersFromNames(names, nameToId);
    while (list.length < 10) {
      list.push({ id: newId(), name: `Player ${list.length + 1}` });
    }
    return list.slice(0, 10);
  };

  const config: MatchConfig = {
    teamA: { name: match.teamAName, players: mkRoster(teamANames), pairs: [] },
    teamB: { name: match.teamBName, players: mkRoster(teamBNames), pairs: [] },
    maxOvers: match.maxOvers,
    tossWinner: match.tossWinner as Side,
    batFirst: match.batFirst as Side,
  };

  return {
    phase: "summary",
    config,
    inningsNumber: 2,
    innings1Result: inn1,
    live: null,
    innings2Result: inn2,
    matchSessionId: match.externalId,
  };
}
