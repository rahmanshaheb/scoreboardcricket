import type { LiveInnings, MatchConfig, Side } from "@/lib/types";

export interface Outcome {
  /** null = tie */
  winner: Side | null;
  headline: string;
  detail: string;
}

/**
 * First innings = innings1Result, second = innings2Result.
 * Winner: higher total. Equal scores = tie.
 */
export function computeOutcome(
  config: MatchConfig,
  first: LiveInnings,
  second: LiveInnings
): Outcome {
  const aName = config.teamA.name;
  const bName = config.teamB.name;

  const name = (s: Side) => (s === "a" ? aName : bName);

  if (first.runs > second.runs) {
    return {
      winner: first.battingSide,
      headline: `${name(first.battingSide)} win`,
      detail: `Defended ${first.runs} — ${name(second.battingSide)} made ${second.runs}.`,
    };
  }
  if (second.runs > first.runs) {
    return {
      winner: second.battingSide,
      headline: `${name(second.battingSide)} win`,
      detail: `Scored ${second.runs} in the chase (first innings ${first.runs}).`,
    };
  }
  return {
    winner: null,
    headline: "Match tied",
    detail: `Both sides scored ${first.runs}.`,
  };
}

/** Short margin line for scoreboard / summary (runs only). */
export function computeWinMargin(
  first: LiveInnings,
  second: LiveInnings
): string {
  const a = first.runs;
  const b = second.runs;
  if (a === b) return "Tie — same total.";
  if (a > b) return `Won by ${a - b} run(s) (defending side).`;
  return `Won by ${b - a} run(s) (chasing side).`;
}
