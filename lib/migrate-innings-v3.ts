import { upgradeLiveInningsV3ToV4 } from "@/lib/migrate-innings-v4";
import type { CompletedPairBlock, LiveInnings, TeamRoster } from "@/lib/types";

/** Upgrade persisted innings from store v2 (pairStats + currentPairIndex) to v3. */
export function upgradeLiveInningsV2ToV3(
  raw: Record<string, unknown>,
  roster: TeamRoster | null
): LiveInnings {
  if (Array.isArray(raw.completedPairs)) {
    return upgradeLiveInningsV3ToV4(raw);
  }

  const currentPairIndex = (raw.currentPairIndex as number) ?? 0;
  const pairStats = (raw.pairStats as { pairOrder: number; runs: number; wicketEvents: number }[]) ?? [];
  const legalBalls = (raw.legalBalls as number) ?? 0;
  const battingSide = raw.battingSide as LiveInnings["battingSide"];

  const completedPairs: CompletedPairBlock[] = [];
  if (roster?.pairs?.length) {
    for (let i = 0; i < currentPairIndex && i < 5; i++) {
      const pr = roster.pairs.find((p) => p.order === i);
      const st = pairStats[i];
      if (pr && st) {
        completedPairs.push({
          pairNumber: i + 1,
          playerIds: [pr.playerIds[0], pr.playerIds[1]],
          runs: st.runs,
          wicketEvents: st.wicketEvents,
          legalBalls: 24,
        });
      }
    }
  }

  const curOrder = Math.min(Math.max(currentPairIndex, 0), 4);
  const curPr = roster?.pairs?.find((p) => p.order === curOrder);
  const curStats = pairStats[curOrder] ?? { runs: 0, wicketEvents: 0 };
  const pairBlockLegalBalls = Math.max(
    0,
    Math.min(
      23,
      legalBalls - completedPairs.length * 24
    )
  );

  let currentPairPlayerIds: [string, string] = ["", ""];
  if (currentPairIndex >= 5) {
    currentPairPlayerIds = ["", ""];
  } else if (curPr) {
    currentPairPlayerIds = [curPr.playerIds[0], curPr.playerIds[1]];
  } else if (roster?.players[0] && roster.players[1]) {
    currentPairPlayerIds = [roster.players[0].id, roster.players[1].id];
  }

  const awaitingNextPairSelection = false;

  return upgradeLiveInningsV3ToV4({
    battingSide,
    runs: (raw.runs as number) ?? 0,
    legalBalls,
    wicketEvents: (raw.wicketEvents as number) ?? 0,
    wicketPenaltyRuns: (raw.wicketPenaltyRuns as number) ?? 0,
    currentPairNumber: currentPairIndex >= 5 ? 6 : curOrder + 1,
    currentPairPlayerIds,
    completedPairs,
    pairBlockLegalBalls,
    currentPairRuns: curStats.runs,
    currentPairWicketEvents: curStats.wicketEvents,
    awaitingNextPairSelection,
    strikerIsFirst: (raw.strikerIsFirst as boolean) ?? true,
    currentBowlerPlayerId: (raw.currentBowlerPlayerId as string | null) ?? null,
    events: (raw.events as LiveInnings["events"]) ?? [],
  });
}
