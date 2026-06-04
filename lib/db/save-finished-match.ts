import { completeLiveMatchSession } from "@/lib/db/save-live-match";
import { playerNameKey } from "@/lib/db/name-key";
import { prisma } from "@/lib/prisma";
import { playerById } from "@/lib/scoring";
import type { MatchConfig, LiveInnings, Side } from "@/lib/types";
import type { Prisma } from "@prisma/client";

export interface SaveFinishedMatchInput {
  externalId: string;
  config: MatchConfig;
  first: LiveInnings;
  second: LiveInnings;
  headline: string;
  detail: string;
  winnerSide: Side | null;
}

function rosterForInnings(config: MatchConfig, batting: Side) {
  return batting === "a" ? config.teamA : config.teamB;
}

async function persistInnings(
  tx: Prisma.TransactionClient,
  matchId: string,
  inningsNumber: 1 | 2,
  inn: LiveInnings,
  config: MatchConfig
) {
  const roster = rosterForInnings(config, inn.battingSide);

  const pairStatsEnriched = inn.completedPairs.map((b) => {
    const batter1 = playerById(roster, b.playerIds[0]);
    const batter2 = playerById(roster, b.playerIds[1]);
    return {
      pairNumber: b.pairNumber,
      pairOrder: b.pairNumber - 1,
      runs: b.runs,
      wicketEvents: b.wicketEvents,
      legalBalls: b.legalBalls,
      batter1,
      batter2,
    };
  });

  await tx.scoreInnings.create({
    data: {
      matchId,
      inningsNumber,
      battingSide: inn.battingSide,
      runs: inn.runs,
      legalBalls: inn.legalBalls,
      wicketEvents: inn.wicketEvents,
      wicketPenaltyRuns: inn.wicketPenaltyRuns,
      pairStatsJson: JSON.stringify(pairStatsEnriched),
      eventsJson: JSON.stringify(inn.events),
    },
  });

  for (const b of inn.completedPairs) {
    const player1Name = playerById(roster, b.playerIds[0]);
    const player2Name = playerById(roster, b.playerIds[1]);
    await tx.pairScoreRecord.create({
      data: {
        matchId,
        inningsNumber,
        teamSide: inn.battingSide,
        pairOrder: b.pairNumber - 1,
        player1Name,
        player1Key: playerNameKey(player1Name),
        player2Name,
        player2Key: playerNameKey(player2Name),
        runs: b.runs,
        wicketEvents: b.wicketEvents,
      },
    });
  }
}

/** Writes match + innings + pair rows; skips if externalId already saved. */
export async function saveFinishedMatch(input: SaveFinishedMatchInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.match.findUnique({
      where: { externalId: input.externalId },
    });
    if (existing) {
      await completeLiveMatchSession(input.externalId);
      return { ok: true as const, duplicate: true, matchId: existing.id };
    }

    const m = await tx.match.create({
      data: {
        externalId: input.externalId,
        teamAName: input.config.teamA.name,
        teamBName: input.config.teamB.name,
        maxOvers: input.config.maxOvers,
        tossWinner: input.config.tossWinner,
        batFirst: input.config.batFirst,
        winnerSide: input.winnerSide,
        headline: input.headline,
        detail: input.detail,
      },
    });

    await persistInnings(tx, m.id, 1, input.first, input.config);
    await persistInnings(tx, m.id, 2, input.second, input.config);

    await completeLiveMatchSession(input.externalId);

    return { ok: true as const, duplicate: false, matchId: m.id };
  });
}
