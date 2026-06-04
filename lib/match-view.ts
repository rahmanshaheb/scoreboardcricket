import type { MatchDbSnapshot } from "@/lib/db/match-snapshot";
import { isMatchDbSnapshot } from "@/lib/db/match-snapshot";
import type { AppPhase, LiveInnings, MatchConfig } from "@/lib/types";

/** Display state for PublicScoreboard (local store or remote poll). */
export type MatchViewState = {
  phase: AppPhase;
  config: MatchConfig | null;
  inningsNumber: 1 | 2;
  innings1Result: LiveInnings | null;
  live: LiveInnings | null;
  innings2Result: LiveInnings | null;
};

export function matchViewFromSnapshot(s: MatchDbSnapshot): MatchViewState {
  return {
    phase: s.phase,
    config: s.config,
    inningsNumber: s.inningsNumber,
    innings1Result: s.innings1Result,
    live: s.live,
    innings2Result: s.innings2Result,
  };
}

export function parseSnapshotJson(json: string): MatchDbSnapshot | null {
  try {
    const raw: unknown = JSON.parse(json);
    return isMatchDbSnapshot(raw) ? raw : null;
  } catch {
    return null;
  }
}
