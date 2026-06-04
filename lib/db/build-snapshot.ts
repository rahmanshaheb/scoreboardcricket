import type { MatchDbSnapshot } from "@/lib/db/match-snapshot";
import type { MatchStore } from "@/lib/store";

const IN_MATCH = new Set<MatchStore["phase"]>([
  "live",
  "innings_break",
  "summary",
]);

/** Build DB payload from current store, or null if nothing to persist. */
export function buildMatchDbSnapshot(
  state: Pick<
    MatchStore,
    | "phase"
    | "config"
    | "inningsNumber"
    | "innings1Result"
    | "live"
    | "innings2Result"
    | "matchSessionId"
  >
): MatchDbSnapshot | null {
  if (!state.matchSessionId || !state.config) return null;
  if (!IN_MATCH.has(state.phase)) return null;
  return {
    phase: state.phase,
    config: state.config,
    inningsNumber: state.inningsNumber,
    innings1Result: state.innings1Result,
    live: state.live,
    innings2Result: state.innings2Result,
    matchSessionId: state.matchSessionId,
  };
}
