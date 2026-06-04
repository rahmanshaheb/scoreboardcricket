import type { BallEvent, LiveInnings, TeamRoster } from "@/lib/types";
import { playerById } from "@/lib/scoring";

export interface PlayerBattingLine {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
}

function pairTimeline(inn: LiveInnings): ([string, string] | undefined)[] {
  const timeline: ([string, string] | undefined)[] = [];
  for (const p of inn.completedPairs) {
    timeline[p.pairNumber - 1] = p.playerIds;
  }
  if (
    inn.currentPairNumber >= 1 &&
    inn.currentPairNumber <= 5 &&
    inn.currentPairPlayerIds[0] &&
    inn.currentPairPlayerIds[1]
  ) {
    timeline[inn.currentPairNumber - 1] = inn.currentPairPlayerIds;
  }
  return timeline;
}

function swapStrikerIds(striker: string, nonStriker: string): [string, string] {
  return [nonStriker, striker];
}

function rotateAfterLegal(
  striker: string,
  nonStriker: string,
  runs: number,
  legalBallsAfter: number
): [string, string] {
  let s = striker;
  let ns = nonStriker;
  if (runs % 2 === 1) [s, ns] = [ns, s];
  if (legalBallsAfter > 0 && legalBallsAfter % 6 === 0) [s, ns] = [ns, s];
  return [s, ns];
}

function bump(
  map: Map<string, { runs: number; balls: number }>,
  playerId: string,
  runs: number,
  balls: number
) {
  if (!playerId) return;
  const cur = map.get(playerId) ?? { runs: 0, balls: 0 };
  map.set(playerId, {
    runs: cur.runs + runs,
    balls: cur.balls + balls,
  });
}

/** Replay deliveries to estimate runs and legal balls per batter. */
export function computePlayerBattingStats(
  inn: LiveInnings,
  roster: TeamRoster
): PlayerBattingLine[] {
  const timeline = pairTimeline(inn);
  const opening = timeline[0] ?? inn.currentPairPlayerIds;
  let striker = opening[0] ?? "";
  let nonStriker = opening[1] ?? "";
  const stats = new Map<string, { runs: number; balls: number }>();

  let prevLegal = 0;

  for (const e of inn.events) {
    const legalAfter = e.legalBallsAfter;
    const legalDelta = legalAfter - prevLegal;

    switch (e.kind) {
      case "runs": {
        bump(stats, striker, e.runsDelta, 1);
        [striker, nonStriker] = rotateAfterLegal(
          striker,
          nonStriker,
          e.runsDelta,
          legalAfter
        );
        break;
      }
      case "wicket": {
        const batter = e.wicket?.batterPlayerId ?? striker;
        bump(stats, batter, e.runsDelta, 1);
        [striker, nonStriker] = rotateAfterLegal(
          striker,
          nonStriker,
          0,
          legalAfter
        );
        break;
      }
      case "wide": {
        const bat = e.batterRuns ?? 0;
        if (bat > 0) bump(stats, striker, bat, 0);
        break;
      }
      case "no_ball": {
        const bat = e.batterRuns ?? 0;
        if (bat > 0) bump(stats, striker, bat, 0);
        if (bat % 2 === 1) [striker, nonStriker] = swapStrikerIds(striker, nonStriker);
        break;
      }
      case "end_over": {
        for (let i = 0; i < legalDelta; i++) {
          const legalNow = prevLegal + i + 1;
          bump(stats, striker, 0, 1);
          [striker, nonStriker] = rotateAfterLegal(striker, nonStriker, 0, legalNow);
        }
        break;
      }
      case "next_pair": {
        const next = timeline[e.pairIndex + 1];
        if (next?.[0] && next[1]) {
          striker = next[0];
          nonStriker = next[1];
        }
        break;
      }
      default:
        break;
    }

    prevLegal = legalAfter;
  }

  const activeIds = new Set<string>();
  if (inn.currentPairPlayerIds[0]) activeIds.add(inn.currentPairPlayerIds[0]);
  if (inn.currentPairPlayerIds[1]) activeIds.add(inn.currentPairPlayerIds[1]);
  for (const p of inn.completedPairs) {
    activeIds.add(p.playerIds[0]);
    activeIds.add(p.playerIds[1]);
  }

  const lines: PlayerBattingLine[] = [];
  for (const id of activeIds) {
    const s = stats.get(id) ?? { runs: 0, balls: 0 };
    lines.push({
      playerId: id,
      name: playerById(roster, id),
      runs: s.runs,
      balls: s.balls,
    });
  }

  lines.sort((a, b) => b.runs - a.runs || b.balls - a.balls);
  return lines;
}

export function strikerPlayerId(inn: LiveInnings): string | null {
  const [a, b] = inn.currentPairPlayerIds;
  if (!a || !b) return null;
  return inn.strikerIsFirst ? a : b;
}
