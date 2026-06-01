import type { BallEvent } from "@/lib/types";

/** Compact scoreboard / timeline text (WD, NB+4, W, etc.). */
export function timelineCompactLabel(e: BallEvent): string {
  if (e.description) return e.description;
  switch (e.kind) {
    case "wide":
      return e.batterRuns ? `WD+${e.batterRuns}` : "WD";
    case "no_ball":
      return e.batterRuns ? `NB+${e.batterRuns}` : "NB";
    case "wicket":
      return "W";
    case "runs":
      return e.runsDelta === 0 ? "0" : String(e.runsDelta);
    case "end_over": {
      const m = e.label.match(/\+(\d+)/);
      return m ? `Eo·${m[1]}d` : "Eo";
    }
    case "next_pair":
      return "⇄";
    default:
      return e.label;
  }
}
