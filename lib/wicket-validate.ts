import { bowlingSide, playerById } from "@/lib/scoring";
import type {
  MatchConfig,
  Side,
  WicketDetailInput,
} from "@/lib/types";

/** Returns an error message or null if valid. */
export function validateWicketDetail(
  input: WicketDetailInput,
  config: MatchConfig,
  battingSide: Side
): string | null {
  const bowlSide = bowlingSide(battingSide);
  const bowling = bowlSide === "a" ? config.teamA : config.teamB;
  const batting = battingSide === "a" ? config.teamA : config.teamB;
  const bowlIds = new Set(bowling.players.map((p) => p.id));
  const batIds = new Set(batting.players.map((p) => p.id));

  if (!input.batterPlayerId || !batIds.has(input.batterPlayerId)) {
    return "Select a valid batter.";
  }

  const runOut = input.dismissalType === "run_out";

  if (!runOut) {
    if (!input.bowlerPlayerId) return "Select bowler.";
    if (!bowlIds.has(input.bowlerPlayerId)) {
      return "Bowler must be from the fielding team.";
    }
  } else {
    if (input.bowlerPlayerId && !bowlIds.has(input.bowlerPlayerId)) {
      return "Bowler must be from the fielding team.";
    }
  }

  if (input.dismissalType === "caught") {
    if (!input.catcherPlayerId) return "Select fielder (catcher).";
    if (!bowlIds.has(input.catcherPlayerId)) {
      return "Catcher must be from the fielding team.";
    }
  }

  if (input.dismissalType === "run_out") {
    if (!input.runOutKind) return "Select run out type.";
    const ids = input.fielderPlayerIds.filter(Boolean);
    if (input.runOutKind === "individual") {
      if (ids.length !== 1) return "Select exactly one fielder.";
    } else {
      if (ids.length < 2) return "Select at least two fielders for joint run out.";
      if (new Set(ids).size !== ids.length) {
        return "Fielders must not be duplicated.";
      }
    }
    for (const id of ids) {
      if (!bowlIds.has(id)) return "Fielders must be from the fielding team.";
    }
  } else if (input.fielderPlayerIds.length > 0) {
    for (const id of input.fielderPlayerIds) {
      if (!bowlIds.has(id)) return "Invalid fielder selection.";
    }
  }

  return null;
}

/** Resolve display name for validation errors. */
export function batterLabel(
  config: MatchConfig,
  battingSide: Side,
  playerId: string
): string {
  const batting = battingSide === "a" ? config.teamA : config.teamB;
  return playerById(batting, playerId);
}
