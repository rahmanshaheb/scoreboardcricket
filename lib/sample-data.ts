import { newId } from "@/lib/id";
import type { BattingPair, Player } from "@/lib/types";
import { PAIRS_PER_TEAM, PLAYERS_PER_TEAM } from "@/lib/constants";

/** Prefill names for quick demos (Mumbai / Delhi style). */
export const SAMPLE_TEAM_A_NAMES = [
  "R. Sharma",
  "Y. Jaiswal",
  "V. Kohli",
  "S. Iyer",
  "R. Pant",
  "H. Pandya",
  "R. Jadeja",
  "K. Yadav",
  "J. Bumrah",
  "M. Siraj",
];

export const SAMPLE_TEAM_B_NAMES = [
  "S. Gill",
  "R. Gaikwad",
  "S. Samson",
  "T. Varma",
  "R. Singh",
  "A. Patel",
  "W. Sundar",
  "M. Shami",
  "A. Khan",
  "P. Krishna",
];

export function makePlayers(names: string[]): Player[] {
  return names.slice(0, PLAYERS_PER_TEAM).map((name) => ({
    id: newId(),
    name: name.trim(),
  }));
}

export function defaultPairsFromPlayers(players: Player[]): BattingPair[] {
  const out: BattingPair[] = [];
  for (let i = 0; i < PAIRS_PER_TEAM; i++) {
    out.push({
      id: newId(),
      order: i,
      playerIds: [players[i * 2].id, players[i * 2 + 1].id],
    });
  }
  return out;
}
