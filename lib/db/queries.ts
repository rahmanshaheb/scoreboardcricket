import { prisma } from "@/lib/prisma";

export async function listRecentMatches(limit = 40) {
  return prisma.match.findMany({
    orderBy: { completedAt: "desc" },
    take: limit,
    include: {
      innings: {
        orderBy: { inningsNumber: "asc" },
      },
    },
  });
}

export type PlayerLeaderboardRow = {
  nameKey: string;
  displayName: string;
  matchesPlayed: number;
  partnershipRuns: number;
  partnershipWickets: number;
};

type Agg = {
  displayName: string;
  matches: Set<string>;
  partnershipRuns: number;
  partnershipWickets: number;
};

function bump(
  map: Map<string, Agg>,
  key: string,
  displayName: string,
  matchId: string,
  runs: number,
  wkts: number
) {
  let row = map.get(key);
  if (!row) {
    row = {
      displayName,
      matches: new Set(),
      partnershipRuns: 0,
      partnershipWickets: 0,
    };
    map.set(key, row);
  }
  row.matches.add(matchId);
  row.partnershipRuns += runs;
  row.partnershipWickets += wkts;
}

/**
 * Aggregate pair stats per player (each pair row credits both batters with that pair's runs/wickets).
 */
export async function getPlayerLeaderboard(
  limit = 50
): Promise<PlayerLeaderboardRow[]> {
  const pairs = await prisma.pairScoreRecord.findMany({
    select: {
      matchId: true,
      player1Key: true,
      player1Name: true,
      player2Key: true,
      player2Name: true,
      runs: true,
      wicketEvents: true,
    },
  });

  const map = new Map<string, Agg>();
  for (const row of pairs) {
    bump(
      map,
      row.player1Key,
      row.player1Name,
      row.matchId,
      row.runs,
      row.wicketEvents
    );
    bump(
      map,
      row.player2Key,
      row.player2Name,
      row.matchId,
      row.runs,
      row.wicketEvents
    );
  }

  return [...map.entries()]
    .map(([nameKey, v]) => ({
      nameKey,
      displayName: v.displayName,
      matchesPlayed: v.matches.size,
      partnershipRuns: v.partnershipRuns,
      partnershipWickets: v.partnershipWickets,
    }))
    .sort(
      (a, b) =>
        b.partnershipRuns - a.partnershipRuns ||
        b.matchesPlayed - a.matchesPlayed
    )
    .slice(0, limit);
}
