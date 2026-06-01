/**
 * Domain types for pair-based local cricket scoring.
 * Rules: 10 players / team, 5 sequential pairs (opening pair at start, rest during match),
 * 4 overs per pair block, wicket = −5 runs (same pair continues).
 */

export type Side = "a" | "b";

/** One squad member */
export interface Player {
  id: string;
  name: string;
}

/** Two players batting together, order 0–4 */
export interface BattingPair {
  id: string;
  order: number;
  playerIds: [string, string];
}

export interface TeamRoster {
  name: string;
  players: Player[];
  pairs: BattingPair[];
}

/** Toss + structural match config (immutable once match starts) */
export interface MatchConfig {
  teamA: TeamRoster;
  teamB: TeamRoster;
  maxOvers: number;
  /** Who won the toss */
  tossWinner: Side;
  /** Who bats first in the match */
  batFirst: Side;
}

export type DismissalType =
  | "bowled"
  | "caught"
  | "run_out"
  | "lbw"
  | "stumped"
  | "hit_wicket"
  | "other";

export type RunOutKind = "individual" | "joint";

/** Persisted wicket metadata (ball history + DB JSON). */
export interface WicketSnapshot {
  dismissalType: DismissalType;
  /** Bowling team; null allowed for run out */
  bowlerPlayerId: string | null;
  batterPlayerId: string;
  catcherPlayerId: string | null;
  runOutKind: RunOutKind | null;
  /** Catcher, or run-out fielder(s); bowling team ids */
  fielderPlayerIds: string[];
  notes: string;
  legalBallsAfter: number;
  /** 0-based over number for this delivery */
  over: number;
  /** 1–6, ball within over */
  ball: number;
}

/** Form → scoring (computed fields added in addWicket). */
export type WicketDetailInput = Omit<
  WicketSnapshot,
  "legalBallsAfter" | "over" | "ball"
>;

export type ExtraDeliveryType = "wide" | "no_ball";

/** Per-bowler figures for one innings (fielding team). */
export interface BowlerInningsFigure {
  legalBallsBowled: number;
  runsConceded: number;
  wickets: number;
  /** Full 6-legal-ball overs completed */
  oversCompleted: number;
}

/** One line in the live commentary / timeline */
export interface BallEvent {
  id: string;
  /** Innings this event belongs to (1 or 2) */
  innings: 1 | 2;
  /** Wall-clock-ish sequence */
  at: number;
  kind: "runs" | "wicket" | "end_over" | "next_pair" | "wide" | "no_ball";
  /** Runs added to team total from this ball (0 for wicket after penalty applied elsewhere) */
  runsDelta: number;
  /** Total team runs after this event */
  totalAfter: number;
  /** Legal balls in innings after this event */
  legalBallsAfter: number;
  /** Human label, e.g. "4 runs", "Wicket (−5)" */
  label: string;
  pairIndex: number;
  /** Present when kind === "wicket" (v2+). */
  wicket?: WicketSnapshot;
  /** v4+: false for wide / no ball */
  isLegalDelivery?: boolean;
  /** 0-based over index (from legal balls before this delivery, for extras context) */
  overNumber?: number;
  /** Legal balls already completed in this over (0–5) before this delivery */
  ballInOver?: number;
  /** Total extras-style runs on this delivery (wide: all runs; no-ball: penalty portion only if split) */
  extras?: number;
  extraType?: ExtraDeliveryType;
  /** Runs off the bat (no-ball) or additional beyond 1 on wide */
  batterRuns?: number;
  /** Bowler credited for this delivery */
  bowlerPlayerIdAtDelivery?: string | null;
  /** Short code e.g. WD+4, NB+1 */
  description?: string;
}

/** One completed pair stint within an innings (full 4 overs or partial if innings ended). */
export interface CompletedPairBlock {
  /** 1-based pair slot in this innings (1…5) */
  pairNumber: number;
  playerIds: [string, string];
  runs: number;
  wicketEvents: number;
  /** Legal balls faced in this stint */
  legalBalls: number;
}

/** In-progress innings */
export interface LiveInnings {
  battingSide: Side;
  runs: number;
  legalBalls: number;
  /** Count of wicket events (−5 each applied to runs) */
  wicketEvents: number;
  /** Sum of wicket penalties (5 × wicketEvents), denormalized for summaries */
  wicketPenaltyRuns: number;
  /** 1-based pair currently batting (1…5), or 6 when all pair blocks are done */
  currentPairNumber: number;
  /** Active batters; empty strings when awaiting next pair selection */
  currentPairPlayerIds: [string, string];
  /** Finished pair stints in order */
  completedPairs: CompletedPairBlock[];
  /** Legal balls in the current pair’s 4-over block (resets after each rotation) */
  pairBlockLegalBalls: number;
  /** Runs scored during the current pair stint (team runs include earlier pairs). */
  currentPairRuns: number;
  currentPairWicketEvents: number;
  /** After 24 balls on pairs 1–4: must pick next pair before scoring */
  awaitingNextPairSelection: boolean;
  /** If true, first player in currentPairPlayerIds is on strike */
  strikerIsFirst: boolean;
  /** Last selected bowler (bowling team); used as default for wicket form. */
  currentBowlerPlayerId?: string | null;
  /** After 6 legal balls, scorer must pick next bowler (not same as last over unless override). */
  awaitingBowlerSelection: boolean;
  /** Bowler who bowled the over that just completed (6 legal balls). */
  lastCompletedOverBowlerPlayerId: string | null;
  /** Bowling team player id → figures */
  bowlerFigures: Record<string, BowlerInningsFigure>;
  events: BallEvent[];
}

export type AppPhase =
  | "home"
  | "setup_teams"
  | "setup_pairs"
  | "live"
  | "innings_break"
  | "summary";
