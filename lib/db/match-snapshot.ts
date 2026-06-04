import type { AppPhase, LiveInnings, MatchConfig } from "@/lib/types";

/** Serializable match state written to LiveMatchSession.stateJson. */
export interface MatchDbSnapshot {
  phase: AppPhase;
  config: MatchConfig;
  inningsNumber: 1 | 2;
  innings1Result: LiveInnings | null;
  live: LiveInnings | null;
  innings2Result: LiveInnings | null;
  matchSessionId: string;
}

const IN_MATCH: AppPhase[] = [
  "live",
  "innings_break",
  "summary",
];

export function isMatchDbSnapshot(x: unknown): x is MatchDbSnapshot {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.phase === "string" &&
    IN_MATCH.includes(o.phase as AppPhase) &&
    o.config != null &&
    typeof o.config === "object" &&
    typeof o.inningsNumber === "number" &&
    typeof o.matchSessionId === "string" &&
    o.matchSessionId.length > 0
  );
}
