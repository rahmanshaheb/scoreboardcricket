/** Players per team (fixed for v1). */
export const PLAYERS_PER_TEAM = 10;

/** Batting pairs per team (10 players ÷ 2). */
export const PAIRS_PER_TEAM = 5;

/** Balls per over. */
export const BALLS_PER_OVER = 6;

/** Each batting pair faces this many overs before rotating. */
export const OVERS_PER_PAIR_BLOCK = 4;

/** Legal balls per pair block (4 overs × 6). */
export const LEGAL_BALLS_PER_PAIR_BLOCK = OVERS_PER_PAIR_BLOCK * BALLS_PER_OVER;

/** Runs deducted per wicket event. */
export const WICKET_PENALTY = 5;

/** Max events kept in timeline UI (full history still in state). */
export const TIMELINE_VISIBLE = 12;

/** Undo stack cap (also limits localStorage size). */
export const MAX_UNDO = 40;

/** localStorage key + schema version for migrations. */
export const STORAGE_KEY = "scoreboard-pair-cricket-v1";
export const STORE_VERSION = 4;

/** Scorer lock expires if no sync within this window (ms). */
export const SCORER_LOCK_MS = 90_000;

/** Scoreboard poll interval (ms). */
export const LIVE_MATCH_POLL_MS = 2_000;
