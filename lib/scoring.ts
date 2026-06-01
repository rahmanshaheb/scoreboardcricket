import {
  BALLS_PER_OVER,
  LEGAL_BALLS_PER_PAIR_BLOCK,
  PAIRS_PER_TEAM,
  WICKET_PENALTY,
} from "@/lib/constants";
import { formatWicketShort } from "@/lib/wicket-format";
import type {
  BallEvent,
  BowlerInningsFigure,
  CompletedPairBlock,
  LiveInnings,
  MatchConfig,
  Player,
  Side,
  TeamRoster,
  WicketDetailInput,
  WicketSnapshot,
} from "@/lib/types";
import { newId } from "@/lib/id";

export function oversFormat(legalBalls: number): string {
  if (legalBalls <= 0) return "0.0";
  const o = Math.floor(legalBalls / BALLS_PER_OVER);
  const b = legalBalls % BALLS_PER_OVER;
  return `${o}.${b}`;
}

export function bowlingSide(batting: Side): Side {
  return batting === "a" ? "b" : "a";
}

export function maxLegalBalls(maxOvers: number): number {
  return maxOvers * BALLS_PER_OVER;
}

/** 0-based index for timeline / wicket labels (pair 1 → 0). */
export function eventPairIndex(inn: LiveInnings): number {
  if (inn.currentPairNumber < 1) return 0;
  return Math.min(PAIRS_PER_TEAM, inn.currentPairNumber) - 1;
}

export function emptyBowlerFigure(): BowlerInningsFigure {
  return {
    legalBallsBowled: 0,
    runsConceded: 0,
    wickets: 0,
    oversCompleted: 0,
  };
}

export function ensureBowlerFigure(
  figures: Record<string, BowlerInningsFigure>,
  bowlerId: string
): BowlerInningsFigure {
  return figures[bowlerId] ?? emptyBowlerFigure();
}

function creditBowlerRunsAndLegal(
  inn: LiveInnings,
  bowlerId: string | null | undefined,
  runs: number,
  legalDelta: number
): LiveInnings {
  if (!bowlerId) return inn;
  const f = ensureBowlerFigure(inn.bowlerFigures, bowlerId);
  return {
    ...inn,
    bowlerFigures: {
      ...inn.bowlerFigures,
      [bowlerId]: {
        ...f,
        runsConceded: f.runsConceded + runs,
        legalBallsBowled: f.legalBallsBowled + legalDelta,
      },
    },
  };
}

function creditBowlerWicket(
  inn: LiveInnings,
  bowlerId: string | null | undefined,
  runsConceded: number
): LiveInnings {
  if (!bowlerId) return inn;
  const f = ensureBowlerFigure(inn.bowlerFigures, bowlerId);
  return {
    ...inn,
    bowlerFigures: {
      ...inn.bowlerFigures,
      [bowlerId]: {
        ...f,
        runsConceded: f.runsConceded + runsConceded,
        legalBallsBowled: f.legalBallsBowled + 1,
        wickets: f.wickets + 1,
      },
    },
  };
}

function creditBowlerExtrasOnly(
  inn: LiveInnings,
  bowlerId: string | null | undefined,
  runs: number
): LiveInnings {
  return creditBowlerRunsAndLegal(inn, bowlerId, runs, 0);
}

/** 0-based over index and completed legals in current over (before next delivery). */
export function legalContextFromInningsLegalBalls(legalBalls: number): {
  overNumber: number;
  ballInOver: number;
} {
  return {
    overNumber: Math.floor(legalBalls / BALLS_PER_OVER),
    ballInOver: legalBalls % BALLS_PER_OVER,
  };
}

export function emptyLiveInnings(
  battingSide: Side,
  openingPairPlayerIds: [string, string]
): LiveInnings {
  return {
    battingSide,
    runs: 0,
    legalBalls: 0,
    wicketEvents: 0,
    wicketPenaltyRuns: 0,
    currentPairNumber: 1,
    currentPairPlayerIds: openingPairPlayerIds,
    completedPairs: [],
    pairBlockLegalBalls: 0,
    currentPairRuns: 0,
    currentPairWicketEvents: 0,
    awaitingNextPairSelection: false,
    strikerIsFirst: true,
    currentBowlerPlayerId: null,
    awaitingBowlerSelection: false,
    lastCompletedOverBowlerPlayerId: null,
    bowlerFigures: {},
    events: [],
  };
}

/** Opening bowler = first player on the fielding team (same default as scoring UI). */
export function emptyLiveInningsForMatch(
  battingSide: Side,
  openingPairPlayerIds: [string, string],
  config: MatchConfig
): LiveInnings {
  const inn = emptyLiveInnings(battingSide, openingPairPlayerIds);
  const bowl = bowlingSide(battingSide);
  const roster = bowl === "a" ? config.teamA : config.teamB;
  return {
    ...inn,
    currentBowlerPlayerId: roster.players[0]?.id ?? null,
  };
}

export function currentPairSlotPlayerIds(inn: LiveInnings): [string, string] {
  return inn.currentPairPlayerIds;
}

export function pairPlayerNamesFromIds(
  roster: TeamRoster,
  ids: [string, string]
): [string, string] {
  if (!ids[0] || !ids[1]) return ["—", "—"];
  return [playerById(roster, ids[0]), playerById(roster, ids[1])];
}

export function usedPlayerIdsInInnings(inn: LiveInnings): Set<string> {
  const s = new Set<string>();
  for (const c of inn.completedPairs) {
    s.add(c.playerIds[0]);
    s.add(c.playerIds[1]);
  }
  if (inn.currentPairPlayerIds[0]) s.add(inn.currentPairPlayerIds[0]);
  if (inn.currentPairPlayerIds[1]) s.add(inn.currentPairPlayerIds[1]);
  return s;
}

export function remainingBatters(roster: TeamRoster, inn: LiveInnings): Player[] {
  const used = usedPlayerIdsInInnings(inn);
  return roster.players.filter((p) => !used.has(p.id));
}

function deliveryOverBall(legalBallsAfter: number): { over: number; ball: number } {
  if (legalBallsAfter < 1) return { over: 0, ball: 1 };
  const over = Math.floor((legalBallsAfter - 1) / BALLS_PER_OVER);
  const ball = ((legalBallsAfter - 1) % BALLS_PER_OVER) + 1;
  return { over, ball };
}

function swapStriker(inn: LiveInnings): LiveInnings {
  return { ...inn, strikerIsFirst: !inn.strikerIsFirst };
}

export function applyStrikeRotation(
  inn: LiveInnings,
  runs: number,
  legalBallsAfter: number
): LiveInnings {
  let next = inn;
  if (runs % 2 === 1) {
    next = swapStriker(next);
  }
  if (legalBallsAfter > 0 && legalBallsAfter % BALLS_PER_OVER === 0) {
    next = swapStriker(next);
  }
  return next;
}

/** Strike change for no-ball bat runs only (legal count unchanged). */
function applyNoBallStrikeRotation(inn: LiveInnings, batRuns: number): LiveInnings {
  let next = inn;
  if (batRuns % 2 === 1) {
    next = swapStriker(next);
  }
  return next;
}

function pushEvent(
  inn: LiveInnings,
  inningsNum: 1 | 2,
  partial: Omit<BallEvent, "id" | "at" | "innings">
): LiveInnings {
  const ev: BallEvent = {
    id: newId(),
    at: Date.now(),
    innings: inningsNum,
    ...partial,
  };
  return { ...inn, events: [...inn.events, ev] };
}

function completedBlockFromCurrent(inn: LiveInnings): CompletedPairBlock {
  return {
    pairNumber: inn.currentPairNumber,
    playerIds: [...inn.currentPairPlayerIds],
    runs: inn.currentPairRuns,
    wicketEvents: inn.currentPairWicketEvents,
    legalBalls: inn.pairBlockLegalBalls,
  };
}

export function afterPairBlockDelivery(
  inn: LiveInnings,
  inningsNum: 1 | 2
): LiveInnings {
  if (inn.pairBlockLegalBalls < LEGAL_BALLS_PER_PAIR_BLOCK) return inn;
  const block = completedBlockFromCurrent(inn);
  if (inn.currentPairNumber >= PAIRS_PER_TEAM) {
    let next: LiveInnings = {
      ...inn,
      completedPairs: [...inn.completedPairs, block],
      currentPairNumber: PAIRS_PER_TEAM + 1,
      currentPairPlayerIds: ["", ""],
      pairBlockLegalBalls: 0,
      currentPairRuns: 0,
      currentPairWicketEvents: 0,
      awaitingNextPairSelection: false,
    };
    return pushEvent(next, inningsNum, {
      kind: "next_pair",
      runsDelta: 0,
      totalAfter: next.runs,
      legalBallsAfter: next.legalBalls,
      label: "All pairs completed",
      pairIndex: PAIRS_PER_TEAM - 1,
      isLegalDelivery: false,
    });
  }
  let next: LiveInnings = {
    ...inn,
    completedPairs: [...inn.completedPairs, block],
    currentPairNumber: inn.currentPairNumber + 1,
    currentPairPlayerIds: ["", ""],
    pairBlockLegalBalls: 0,
    currentPairRuns: 0,
    currentPairWicketEvents: 0,
    awaitingNextPairSelection: true,
  };
  next = pushEvent(next, inningsNum, {
    kind: "next_pair",
    runsDelta: 0,
    totalAfter: next.runs,
    legalBallsAfter: next.legalBalls,
    label: `Select next pair (after pair ${block.pairNumber})`,
    pairIndex: block.pairNumber - 1,
    isLegalDelivery: false,
  });
  return next;
}

export function applyNextPairSelection(
  inn: LiveInnings,
  playerIds: [string, string]
): LiveInnings {
  if (!inn.awaitingNextPairSelection) return inn;
  return {
    ...inn,
    currentPairPlayerIds: playerIds,
    awaitingNextPairSelection: false,
    strikerIsFirst: true,
  };
}

export function sealPartialPairIfActive(inn: LiveInnings): LiveInnings {
  if (inn.currentPairNumber > PAIRS_PER_TEAM) return inn;
  if (!inn.currentPairPlayerIds[0] || !inn.currentPairPlayerIds[1]) return inn;
  if (
    inn.pairBlockLegalBalls === 0 &&
    inn.currentPairRuns === 0 &&
    inn.currentPairWicketEvents === 0
  ) {
    return inn;
  }
  const block = completedBlockFromCurrent(inn);
  return {
    ...inn,
    completedPairs: [...inn.completedPairs, block],
    currentPairNumber: PAIRS_PER_TEAM + 1,
    currentPairPlayerIds: ["", ""],
    pairBlockLegalBalls: 0,
    currentPairRuns: 0,
    currentPairWicketEvents: 0,
    awaitingNextPairSelection: false,
  };
}

/** After 6 legal balls: require a new bowler for the next delivery. */
export function maybeMarkOverFinished(
  inn: LiveInnings,
  legalBallsAfter: number
): LiveInnings {
  if (legalBallsAfter <= 0 || legalBallsAfter % BALLS_PER_OVER !== 0) {
    return inn;
  }
  const bowlerId = inn.currentBowlerPlayerId;
  if (!bowlerId) {
    return {
      ...inn,
      awaitingBowlerSelection: true,
      lastCompletedOverBowlerPlayerId: null,
    };
  }
  const f = ensureBowlerFigure(inn.bowlerFigures, bowlerId);
  return {
    ...inn,
    awaitingBowlerSelection: true,
    lastCompletedOverBowlerPlayerId: bowlerId,
    bowlerFigures: {
      ...inn.bowlerFigures,
      [bowlerId]: { ...f, oversCompleted: f.oversCompleted + 1 },
    },
  };
}

export function confirmBowlerForNextOver(
  inn: LiveInnings,
  bowlerId: string,
  allowSameAsLast = false
): LiveInnings {
  if (!inn.awaitingBowlerSelection) return inn;
  if (
    !allowSameAsLast &&
    inn.lastCompletedOverBowlerPlayerId &&
    inn.lastCompletedOverBowlerPlayerId === bowlerId
  ) {
    return inn;
  }
  return {
    ...inn,
    currentBowlerPlayerId: bowlerId,
    awaitingBowlerSelection: false,
  };
}

export function addRuns(
  inn: LiveInnings,
  inningsNum: 1 | 2,
  runs: number
): LiveInnings {
  const pIdx = eventPairIndex(inn);
  const legalBallsAfter = inn.legalBalls + 1;
  const pairBlockAfter = inn.pairBlockLegalBalls + 1;
  const bowlerId = inn.currentBowlerPlayerId;
  const ctx = legalContextFromInningsLegalBalls(inn.legalBalls);
  let next: LiveInnings = {
    ...inn,
    runs: inn.runs + runs,
    legalBalls: legalBallsAfter,
    pairBlockLegalBalls: pairBlockAfter,
    currentPairRuns: inn.currentPairRuns + runs,
  };
  next = creditBowlerRunsAndLegal(next, bowlerId, runs, 1);
  next = applyStrikeRotation(next, runs, legalBallsAfter);
  next = pushEvent(next, inningsNum, {
    kind: "runs",
    runsDelta: runs,
    totalAfter: next.runs,
    legalBallsAfter,
    label: runs === 0 ? "0" : `${runs} run${runs === 1 ? "" : "s"}`,
    pairIndex: pIdx,
    isLegalDelivery: true,
    overNumber: ctx.overNumber,
    ballInOver: ctx.ballInOver,
    bowlerPlayerIdAtDelivery: bowlerId,
    description: runs === 0 ? "0" : String(runs),
  });
  next = maybeMarkOverFinished(next, legalBallsAfter);
  return afterPairBlockDelivery(next, inningsNum);
}

export function addWide(
  inn: LiveInnings,
  inningsNum: 1 | 2,
  additionalRuns: 0 | 1 | 2 | 3 | 4 | 6
): LiveInnings {
  const total = 1 + additionalRuns;
  const pIdx = eventPairIndex(inn);
  const bowlerId = inn.currentBowlerPlayerId;
  const ctx = legalContextFromInningsLegalBalls(inn.legalBalls);
  const desc = additionalRuns === 0 ? "WD" : `WD+${additionalRuns}`;
  let next: LiveInnings = {
    ...inn,
    runs: inn.runs + total,
    currentPairRuns: inn.currentPairRuns + total,
  };
  next = creditBowlerExtrasOnly(next, bowlerId, total);
  next = pushEvent(next, inningsNum, {
    kind: "wide",
    runsDelta: total,
    totalAfter: next.runs,
    legalBallsAfter: inn.legalBalls,
    label: additionalRuns === 0 ? "Wide" : `Wide +${additionalRuns}`,
    pairIndex: pIdx,
    isLegalDelivery: false,
    overNumber: ctx.overNumber,
    ballInOver: ctx.ballInOver,
    extras: total,
    extraType: "wide",
    batterRuns: additionalRuns,
    bowlerPlayerIdAtDelivery: bowlerId,
    description: desc,
  });
  return afterPairBlockDelivery(next, inningsNum);
}

export function addNoBall(
  inn: LiveInnings,
  inningsNum: 1 | 2,
  batRuns: 0 | 1 | 2 | 3 | 4 | 6
): LiveInnings {
  const total = 1 + batRuns;
  const pIdx = eventPairIndex(inn);
  const bowlerId = inn.currentBowlerPlayerId;
  const ctx = legalContextFromInningsLegalBalls(inn.legalBalls);
  const desc = batRuns === 0 ? "NB" : `NB+${batRuns}`;
  let next: LiveInnings = {
    ...inn,
    runs: inn.runs + total,
    currentPairRuns: inn.currentPairRuns + total,
  };
  next = creditBowlerExtrasOnly(next, bowlerId, total);
  next = applyNoBallStrikeRotation(next, batRuns);
  next = pushEvent(next, inningsNum, {
    kind: "no_ball",
    runsDelta: total,
    totalAfter: next.runs,
    legalBallsAfter: inn.legalBalls,
    label:
      batRuns === 0
        ? "No ball"
        : `No ball +${batRuns}`,
    pairIndex: pIdx,
    isLegalDelivery: false,
    overNumber: ctx.overNumber,
    ballInOver: ctx.ballInOver,
    extras: 1,
    extraType: "no_ball",
    batterRuns: batRuns,
    bowlerPlayerIdAtDelivery: bowlerId,
    description: desc,
  });
  return afterPairBlockDelivery(next, inningsNum);
}

export function addWicket(
  inn: LiveInnings,
  inningsNum: 1 | 2,
  config: MatchConfig,
  input: WicketDetailInput
): LiveInnings {
  const pIdx = eventPairIndex(inn);
  const legalBallsAfter = inn.legalBalls + 1;
  const pairBlockAfter = inn.pairBlockLegalBalls + 1;
  const penalty = WICKET_PENALTY;
  const { over, ball } = deliveryOverBall(legalBallsAfter);
  const snapshot: WicketSnapshot = {
    ...input,
    legalBallsAfter,
    over,
    ball,
  };
  const label = formatWicketShort(snapshot, config, inn.battingSide);
  const bowlerCredit =
    input.bowlerPlayerId ?? inn.currentBowlerPlayerId ?? null;
  const ctx = legalContextFromInningsLegalBalls(inn.legalBalls);
  let next: LiveInnings = {
    ...inn,
    runs: inn.runs - penalty,
    legalBalls: legalBallsAfter,
    pairBlockLegalBalls: pairBlockAfter,
    wicketEvents: inn.wicketEvents + 1,
    wicketPenaltyRuns: inn.wicketPenaltyRuns + penalty,
    currentPairRuns: inn.currentPairRuns - penalty,
    currentPairWicketEvents: inn.currentPairWicketEvents + 1,
    currentBowlerPlayerId:
      input.bowlerPlayerId ?? inn.currentBowlerPlayerId ?? null,
  };
  next = creditBowlerWicket(next, bowlerCredit, penalty);
  if (legalBallsAfter % BALLS_PER_OVER === 0) {
    next = swapStriker(next);
  }
  next = pushEvent(next, inningsNum, {
    kind: "wicket",
    runsDelta: -penalty,
    totalAfter: next.runs,
    legalBallsAfter,
    label,
    pairIndex: pIdx,
    wicket: snapshot,
    isLegalDelivery: true,
    overNumber: ctx.overNumber,
    ballInOver: ctx.ballInOver,
    bowlerPlayerIdAtDelivery: bowlerCredit,
    description: "W",
  });
  next = maybeMarkOverFinished(next, legalBallsAfter);
  return afterPairBlockDelivery(next, inningsNum);
}

export function endOver(inn: LiveInnings, inningsNum: 1 | 2): LiveInnings {
  const pIdx = eventPairIndex(inn);
  const inOver = inn.legalBalls % BALLS_PER_OVER;
  const toAdd = inOver === 0 ? 0 : BALLS_PER_OVER - inOver;
  if (toAdd === 0) {
    return pushEvent({ ...inn }, inningsNum, {
      kind: "end_over",
      runsDelta: 0,
      totalAfter: inn.runs,
      legalBallsAfter: inn.legalBalls,
      label: "End over (already complete)",
      pairIndex: pIdx,
      isLegalDelivery: false,
    });
  }
  let cur = inn;
  for (let i = 0; i < toAdd; i++) {
    if (
      cur.awaitingNextPairSelection ||
      cur.awaitingBowlerSelection
    ) {
      break;
    }
    const legalAfter = cur.legalBalls + 1;
    cur = {
      ...cur,
      legalBalls: legalAfter,
      pairBlockLegalBalls: cur.pairBlockLegalBalls + 1,
    };
    cur = creditBowlerRunsAndLegal(cur, cur.currentBowlerPlayerId, 0, 1);
    cur = applyStrikeRotation(cur, 0, legalAfter);
    cur = maybeMarkOverFinished(cur, legalAfter);
    cur = afterPairBlockDelivery(cur, inningsNum);
  }
  const added = cur.legalBalls - inn.legalBalls;
  if (added === 0) {
    return pushEvent({ ...inn }, inningsNum, {
      kind: "end_over",
      runsDelta: 0,
      totalAfter: inn.runs,
      legalBallsAfter: inn.legalBalls,
      label: "End over (blocked — pair or bowler)",
      pairIndex: pIdx,
      isLegalDelivery: false,
    });
  }
  return pushEvent(cur, inningsNum, {
    kind: "end_over",
    runsDelta: 0,
    totalAfter: cur.runs,
    legalBallsAfter: cur.legalBalls,
    label: `End over (+${added} dot${added === 1 ? "" : "s"})`,
    pairIndex: eventPairIndex(cur),
    isLegalDelivery: true,
  });
}

export function isInningsComplete(inn: LiveInnings, maxOvers: number): boolean {
  if (inn.legalBalls >= maxLegalBalls(maxOvers)) return true;
  if (inn.currentPairNumber > PAIRS_PER_TEAM) return true;
  return false;
}

export function playerById(roster: TeamRoster, id: string): string {
  return roster.players.find((p) => p.id === id)?.name ?? "?";
}

export function pairPlayers(
  roster: TeamRoster,
  pairOrder: number
): [string, string] {
  const pair = roster.pairs.find((p) => p.order === pairOrder);
  if (!pair) return ["?", "?"];
  return [
    playerById(roster, pair.playerIds[0]),
    playerById(roster, pair.playerIds[1]),
  ];
}
