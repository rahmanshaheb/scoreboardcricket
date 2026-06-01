import type { AppPhase } from "@/lib/types";

/** Stable arrays for redirect dependency safety. */
export const PHASE_GUARD = {
  home: ["home"] as AppPhase[],
  /** Team form: allow returning from pairs via “Edit teams”. */
  setupFlow: ["setup_teams", "setup_pairs"] as AppPhase[],
  setupPairs: ["setup_pairs"] as AppPhase[],
  live: ["live"] as AppPhase[],
  inningsBreak: ["innings_break"] as AppPhase[],
  summary: ["summary"] as AppPhase[],
};

/** Deep-link target for the current persisted phase. */
export function pathForPhase(phase: AppPhase): string {
  switch (phase) {
    case "setup_teams":
      return "/setup";
    case "setup_pairs":
      return "/setup/pairs";
    case "live":
      return "/scoring";
    case "innings_break":
      return "/break";
    case "summary":
      return "/summary";
    default:
      return "/";
  }
}
