import { bowlingSide, oversFormat, playerById } from "@/lib/scoring";
import type { MatchConfig, Side, WicketSnapshot } from "@/lib/types";

const TYPE_SHORT: Record<WicketSnapshot["dismissalType"], string> = {
  bowled: "Bowled",
  caught: "Caught",
  run_out: "Run Out",
  lbw: "LBW",
  stumped: "Stumped",
  hit_wicket: "Hit Wicket",
  other: "Other",
};

function names(config: MatchConfig, side: Side, ids: string[]): string {
  const roster = side === "a" ? config.teamA : config.teamB;
  return ids.map((id) => playerById(roster, id)).join(", ");
}

/** One-line summary for sticky header / timeline. */
export function formatWicketShort(
  w: WicketSnapshot,
  config: MatchConfig,
  battingSide: Side
): string {
  const bowlSide = bowlingSide(battingSide);
  const batRoster = battingSide === "a" ? config.teamA : config.teamB;
  const batter = playerById(batRoster, w.batterPlayerId);
  const bowler =
    w.bowlerPlayerId != null
      ? playerById(
          bowlSide === "a" ? config.teamA : config.teamB,
          w.bowlerPlayerId
        )
      : null;

  const t = TYPE_SHORT[w.dismissalType];

  if (w.dismissalType === "caught") {
    const cat = w.catcherPlayerId
      ? playerById(
          bowlSide === "a" ? config.teamA : config.teamB,
          w.catcherPlayerId
        )
      : null;
    if (cat && bowler) {
      return `W: ${t} — ${batter} (c ${cat} b ${bowler})`;
    }
    if (bowler) return `W: ${t} — ${batter} (b ${bowler})`;
    return `W: ${t} — ${batter}`;
  }

  if (w.dismissalType === "run_out") {
    const flds = names(config, bowlSide, w.fielderPlayerIds);
    if (w.runOutKind === "joint" && flds) {
      return `W: ${t} (Joint: ${flds}) — ${batter}`;
    }
    if (flds) return `W: ${t} — ${batter} (${flds})`;
    return `W: ${t} — ${batter}`;
  }

  if (bowler) return `W: ${t} — ${batter} (b ${bowler})`;
  return `W: ${t} — ${batter}`;
}

/** Longer line for match summary. */
export function formatWicketDetailed(
  w: WicketSnapshot,
  config: MatchConfig,
  battingSide: Side,
  pairIndex: number
): string {
  const base = formatWicketShort(w, config, battingSide);
  const at = oversFormat(w.legalBallsAfter);
  const bits = [`${base} @ ${at} ov`, `Pair ${pairIndex + 1}`];
  if (w.notes?.trim()) bits.push(w.notes.trim());
  return bits.join(" · ");
}
