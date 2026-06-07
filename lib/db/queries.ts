import { parseSnapshotJson } from "@/lib/match-view";
import type { AppPhase } from "@/lib/types";
import { oversFormat } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";

export type MatchLibraryItem = {
  externalId: string;
  teamAName: string;
  teamBName: string;
  statusLabel: string;
  scoreSummary: string;
  headline: string | null;
  updatedAt: string;
  hasSnapshot: boolean;
  canShareScoreboard: boolean;
  phase: AppPhase | null;
};

function scoreSummaryFromSnapshot(
  snap: ReturnType<typeof parseSnapshotJson>
): string {
  if (!snap) return "—";
  const parts: string[] = [];
  if (snap.innings1Result) {
    parts.push(
      `${snap.innings1Result.runs} (${oversFormat(snap.innings1Result.legalBalls)} ov)`
    );
  }
  const cur = snap.live ?? snap.innings2Result;
  if (cur) {
    parts.push(`${cur.runs} (${oversFormat(cur.legalBalls)} ov)`);
  }
  return parts.join(" · ") || "—";
}

function statusLabel(
  sessionStatus: string,
  phase: AppPhase | null | undefined
): string {
  if (sessionStatus === "completed" || phase === "summary") return "Finished";
  if (phase === "innings_break") return "Innings break";
  if (phase === "live") return "In progress";
  return sessionStatus === "live" ? "In progress" : "Saved";
}

function inningsScoreSummary(
  innings: { runs: number; legalBalls: number }[]
): string {
  return (
    innings
      .map((inn) => `${inn.runs} (${oversFormat(inn.legalBalls)} ov)`)
      .join(" · ") || "—"
  );
}

/** Live + finished matches for the library page (deduped by externalId). */
export async function listMatchLibrary(
  limit = 60
): Promise<MatchLibraryItem[]> {
  const [liveRows, finishedRows] = await Promise.all([
    prisma.liveMatchSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.match.findMany({
      where: { externalId: { not: null } },
      orderBy: { completedAt: "desc" },
      take: limit,
      include: {
        innings: { orderBy: { inningsNumber: "asc" } },
      },
    }),
  ]);

  const map = new Map<string, MatchLibraryItem>();

  for (const row of liveRows) {
    const snap = parseSnapshotJson(row.stateJson);
    map.set(row.externalId, {
      externalId: row.externalId,
      teamAName: row.teamAName,
      teamBName: row.teamBName,
      statusLabel: statusLabel(row.status, snap?.phase),
      scoreSummary: scoreSummaryFromSnapshot(snap),
      headline: null,
      updatedAt: row.updatedAt.toISOString(),
      hasSnapshot: snap != null,
      canShareScoreboard: true,
      phase: snap?.phase ?? null,
    });
  }

  for (const m of finishedRows) {
    if (!m.externalId) continue;
    const existing = map.get(m.externalId);
    if (existing) {
      existing.headline = m.headline;
      existing.statusLabel = "Finished";
      existing.hasSnapshot = existing.hasSnapshot || m.innings.length >= 2;
      existing.canShareScoreboard = true;
      const completedIso = m.completedAt.toISOString();
      if (completedIso > existing.updatedAt) {
        existing.updatedAt = completedIso;
      }
      continue;
    }
    map.set(m.externalId, {
      externalId: m.externalId,
      teamAName: m.teamAName,
      teamBName: m.teamBName,
      statusLabel: "Finished",
      scoreSummary: inningsScoreSummary(m.innings),
      headline: m.headline,
      updatedAt: m.completedAt.toISOString(),
      hasSnapshot: m.innings.length >= 2,
      canShareScoreboard: true,
      phase: "summary",
    });
  }

  return [...map.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

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
