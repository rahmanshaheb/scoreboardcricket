import type { AppPhase, LiveInnings, MatchConfig } from "@/lib/types";

export type PublicScoreboardMode =
  | "idle"
  | "setup"
  | "first_innings"
  | "innings_break"
  | "second_innings"
  | "completed";

export function derivePublicMode(
  phase: AppPhase,
  config: MatchConfig | null,
  inningsNumber: 1 | 2
): PublicScoreboardMode {
  if (!config) {
    if (phase === "setup_teams" || phase === "setup_pairs") return "setup";
    return "idle";
  }
  if (phase === "summary") return "completed";
  if (phase === "innings_break") return "innings_break";
  if (phase === "live") {
    return inningsNumber === 1 ? "first_innings" : "second_innings";
  }
  if (phase === "setup_teams" || phase === "setup_pairs") return "setup";
  return "idle";
}

/** Innings snapshot to show for stats (live or frozen). */
export function currentDisplayInnings(
  mode: PublicScoreboardMode,
  live: LiveInnings | null,
  innings1Result: LiveInnings | null,
  innings2Result: LiveInnings | null
): LiveInnings | null {
  if (mode === "first_innings" || mode === "second_innings") return live;
  if (mode === "innings_break") return innings1Result;
  if (mode === "completed") return innings2Result ?? innings1Result;
  return null;
}
