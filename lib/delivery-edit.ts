import type { BallEvent, LiveInnings, MatchConfig, WicketDetailInput } from "@/lib/types";
import {
  addNoBall,
  addRuns,
  addWide,
  addWicket,
  makeQuickWicket,
} from "@/lib/scoring";

export type DeliveryEdit =
  | { kind: "runs"; runs: number }
  | { kind: "wide"; additionalRuns: number }
  | { kind: "no_ball"; batRuns: number }
  | { kind: "wicket"; detail?: WicketDetailInput };

/** Build a replacement delivery event at `inn` without mutating later history. */
export function synthesizeDeliveryEvent(
  inn: LiveInnings,
  config: MatchConfig,
  inningsNum: 1 | 2,
  original: BallEvent,
  edit: DeliveryEdit
): BallEvent | null {
  let next: LiveInnings;
  switch (edit.kind) {
    case "runs":
      next = addRuns(inn, inningsNum, edit.runs);
      break;
    case "wide":
      next = addWide(inn, inningsNum, edit.additionalRuns);
      break;
    case "no_ball":
      next = addNoBall(inn, inningsNum, edit.batRuns);
      break;
    case "wicket": {
      const detail =
        edit.detail ??
        original.wicket ??
        makeQuickWicket(inn, "bowled");
      if (!detail) return null;
      next = addWicket(inn, inningsNum, config, detail);
      break;
    }
    default:
      return null;
  }

  const generated = next.events.slice(inn.events.length);
  const delivery = generated.find(
    (e) =>
      e.kind === edit.kind ||
      (edit.kind === "wicket" && e.kind === "wicket")
  );
  if (!delivery) return null;

  return {
    ...delivery,
    id: original.id,
    at: original.at,
    innings: original.innings,
  };
}

/** Extra runs off a wide/no-ball chip (0 = penalty only). */
export function extraRunsFromEvent(e: BallEvent): number {
  if (e.batterRuns != null) return e.batterRuns;
  if (e.kind === "wide" || e.kind === "no_ball") {
    return Math.max(0, e.runsDelta - 1);
  }
  return 0;
}

export function runsFromEvent(e: BallEvent): number {
  if (e.kind === "runs") return e.runsDelta;
  return 0;
}
