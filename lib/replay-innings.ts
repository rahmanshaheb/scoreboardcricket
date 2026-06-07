import {
  LEGAL_BALLS_PER_PAIR_BLOCK,
  WICKET_PENALTY,
} from "@/lib/constants";
import {
  synthesizeDeliveryEvent,
  type DeliveryEdit,
} from "@/lib/delivery-edit";
import {
  addExtraWicket,
  applyNextPairSelection,
  applyStrikeRotation,
  confirmBowlerForNextOver,
  emptyLiveInningsForMatch,
  endOver,
  ensureBowlerFigure,
  eventPairIndex,
  maybeMarkOverFinished,
} from "@/lib/scoring";
import type {
  BallEvent,
  CompletedPairBlock,
  LiveInnings,
  MatchConfig,
  Side,
} from "@/lib/types";

function completedBlockFromCurrent(inn: LiveInnings): CompletedPairBlock {
  return {
    pairNumber: inn.currentPairNumber,
    playerIds: [...inn.currentPairPlayerIds],
    runs: inn.currentPairRuns,
    wicketEvents: inn.currentPairWicketEvents,
    legalBalls: inn.pairBlockLegalBalls,
  };
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

function creditBowlerExtrasOnly(
  inn: LiveInnings,
  bowlerId: string | null | undefined,
  runs: number
): LiveInnings {
  return creditBowlerRunsAndLegal(inn, bowlerId, runs, 0);
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

function creditBowlerIllegalWicket(
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
        wickets: f.wickets + 1,
      },
    },
  };
}

function applyNoBallStrikeRotation(
  inn: LiveInnings,
  batRuns: number
): LiveInnings {
  if (batRuns % 2 === 1) {
    return { ...inn, strikerIsFirst: !inn.strikerIsFirst };
  }
  return inn;
}

function finishPairBlock(inn: LiveInnings): LiveInnings {
  const block = completedBlockFromCurrent(inn);
  if (inn.currentPairNumber >= 5) {
    return {
      ...inn,
      completedPairs: [...inn.completedPairs, block],
      currentPairNumber: 6,
      currentPairPlayerIds: ["", ""],
      pairBlockLegalBalls: 0,
      currentPairRuns: 0,
      currentPairWicketEvents: 0,
      awaitingNextPairSelection: false,
    };
  }
  return {
    ...inn,
    completedPairs: [...inn.completedPairs, block],
    currentPairNumber: inn.currentPairNumber + 1,
    currentPairPlayerIds: ["", ""],
    pairBlockLegalBalls: 0,
    currentPairRuns: 0,
    currentPairWicketEvents: 0,
    awaitingNextPairSelection: true,
  };
}

function appendEvent(
  inn: LiveInnings,
  e: BallEvent,
  out: BallEvent[]
): LiveInnings {
  const event = {
    ...e,
    totalAfter: inn.runs,
    legalBallsAfter: inn.legalBalls,
    pairIndex: eventPairIndex(inn),
  };
  return { ...inn, events: [...out, event] };
}

function resolvePreDelivery(
  inn: LiveInnings,
  e: BallEvent,
  pairLookup: Map<number, [string, string]>
): LiveInnings {
  let cur = inn;
  if (cur.awaitingNextPairSelection) {
    const pairIds = pairLookup.get(cur.currentPairNumber);
    if (pairIds?.[0] && pairIds[1]) {
      cur = applyNextPairSelection(cur, pairIds);
    }
  }
  if (cur.awaitingBowlerSelection) {
    const bowlerId = e.bowlerPlayerIdAtDelivery ?? cur.currentBowlerPlayerId;
    if (bowlerId) {
      cur = confirmBowlerForNextOver(cur, bowlerId, true);
    }
  }
  return cur;
}

function applyStoredEvent(
  inn: LiveInnings,
  e: BallEvent,
  config: MatchConfig,
  inningsNum: 1 | 2,
  out: BallEvent[]
): LiveInnings {
  const bowlerId = e.bowlerPlayerIdAtDelivery ?? inn.currentBowlerPlayerId;

  switch (e.kind) {
    case "runs": {
      const legalBallsAfter = inn.legalBalls + 1;
      const pairBlockAfter = inn.pairBlockLegalBalls + 1;
      let next: LiveInnings = {
        ...inn,
        runs: inn.runs + e.runsDelta,
        legalBalls: legalBallsAfter,
        pairBlockLegalBalls: pairBlockAfter,
        currentPairRuns: inn.currentPairRuns + e.runsDelta,
        currentBowlerPlayerId: bowlerId,
      };
      next = creditBowlerRunsAndLegal(next, bowlerId, e.runsDelta, 1);
      next = applyStrikeRotation(next, e.runsDelta, legalBallsAfter);
      next = maybeMarkOverFinished(next, legalBallsAfter);
      if (pairBlockAfter >= LEGAL_BALLS_PER_PAIR_BLOCK) {
        next = finishPairBlock(next);
      }
      return appendEvent(next, e, out);
    }
    case "wide": {
      const bat = e.batterRuns ?? Math.max(0, e.runsDelta - 1);
      const total = 1 + bat;
      let next: LiveInnings = {
        ...inn,
        runs: inn.runs + total,
        currentPairRuns: inn.currentPairRuns + total,
        currentBowlerPlayerId: bowlerId,
      };
      next = creditBowlerExtrasOnly(next, bowlerId, total);
      return appendEvent(next, e, out);
    }
    case "no_ball": {
      const bat = e.batterRuns ?? Math.max(0, e.runsDelta - 1);
      const total = 1 + bat;
      let next: LiveInnings = {
        ...inn,
        runs: inn.runs + total,
        currentPairRuns: inn.currentPairRuns + total,
        currentBowlerPlayerId: bowlerId,
      };
      next = creditBowlerExtrasOnly(next, bowlerId, total);
      next = applyNoBallStrikeRotation(next, bat);
      return appendEvent(next, e, out);
    }
    case "wicket": {
      if (e.isLegalDelivery === false && e.extraType) {
        const automaticExtra = 1;
        const penalty = WICKET_PENALTY;
        const runsDelta = automaticExtra - penalty;
        let next: LiveInnings = {
          ...inn,
          runs: inn.runs + runsDelta,
          wicketEvents: inn.wicketEvents + 1,
          wicketPenaltyRuns: inn.wicketPenaltyRuns + penalty,
          currentPairRuns: inn.currentPairRuns + runsDelta,
          currentPairWicketEvents: inn.currentPairWicketEvents + 1,
          currentBowlerPlayerId: bowlerId,
        };
        next = creditBowlerIllegalWicket(next, bowlerId, automaticExtra);
        return appendEvent(next, e, out);
      }
      const legalBallsAfter = inn.legalBalls + 1;
      const pairBlockAfter = inn.pairBlockLegalBalls + 1;
      const penalty = WICKET_PENALTY;
      let next: LiveInnings = {
        ...inn,
        runs: inn.runs - penalty,
        legalBalls: legalBallsAfter,
        pairBlockLegalBalls: pairBlockAfter,
        wicketEvents: inn.wicketEvents + 1,
        wicketPenaltyRuns: inn.wicketPenaltyRuns + penalty,
        currentPairRuns: inn.currentPairRuns - penalty,
        currentPairWicketEvents: inn.currentPairWicketEvents + 1,
        currentBowlerPlayerId: bowlerId,
      };
      next = creditBowlerWicket(next, bowlerId, penalty);
      if (legalBallsAfter % 6 === 0) {
        next = { ...next, strikerIsFirst: !next.strikerIsFirst };
      }
      next = maybeMarkOverFinished(next, legalBallsAfter);
      if (pairBlockAfter >= LEGAL_BALLS_PER_PAIR_BLOCK) {
        next = finishPairBlock(next);
      }
      return appendEvent(next, e, out);
    }
    case "next_pair":
      return appendEvent(inn, e, out);
    case "end_over": {
      const replayed = endOver(inn, inningsNum);
      const generated = replayed.events.slice(inn.events.length);
      const endEv = generated.find((x) => x.kind === "end_over") ?? e;
      const merged = {
        ...endEv,
        id: e.id,
        at: e.at,
        innings: e.innings,
        label: e.label,
        description: e.description,
      };
      return {
        ...replayed,
        events: [...out, merged],
      };
    }
    default:
      return appendEvent(inn, e, out);
  }
}

/** Pair number → player ids from a live innings snapshot. */
export function buildPairLookup(inn: LiveInnings): Map<number, [string, string]> {
  const map = new Map<number, [string, string]>();
  for (const block of inn.completedPairs) {
    map.set(block.pairNumber, block.playerIds);
  }
  if (
    inn.currentPairNumber >= 1 &&
    inn.currentPairNumber <= 5 &&
    inn.currentPairPlayerIds[0] &&
    inn.currentPairPlayerIds[1]
  ) {
    map.set(inn.currentPairNumber, inn.currentPairPlayerIds);
  }
  return map;
}

/** Rebuild innings totals and state from an ordered event list. */
export function replayInningsFromEvents(
  config: MatchConfig,
  inningsNum: 1 | 2,
  battingSide: Side,
  openingPair: [string, string],
  inputEvents: BallEvent[],
  pairLookup: Map<number, [string, string]>
): LiveInnings {
  let inn = emptyLiveInningsForMatch(battingSide, openingPair, config);
  const out: BallEvent[] = [];

  for (const e of inputEvents) {
    inn = { ...inn, events: out };
    inn = resolvePreDelivery(inn, e, pairLookup);
    inn = applyStoredEvent(inn, e, config, inningsNum, out);
    out.length = 0;
    out.push(...inn.events);
    inn = { ...inn, events: out };
  }

  return inn;
}

/** Replay up to (not including) `eventId`, for synthesizing an edited delivery. */
export function replayInningsBeforeEvent(
  config: MatchConfig,
  inningsNum: 1 | 2,
  live: LiveInnings,
  eventId: string
): LiveInnings | null {
  const idx = live.events.findIndex((e) => e.id === eventId);
  if (idx < 0) return null;
  const pairLookup = buildPairLookup(live);
  const opening =
    pairLookup.get(1) ??
    (live.currentPairNumber === 1
      ? live.currentPairPlayerIds
      : live.completedPairs[0]?.playerIds);
  if (!opening?.[0] || !opening[1]) return null;
  return replayInningsFromEvents(
    config,
    inningsNum,
    live.battingSide,
    opening,
    live.events.slice(0, idx),
    pairLookup
  );
}

/** Fast path: use scoring helpers when replaying a single edited delivery into a list. */
export function replayWithEditedDelivery(
  config: MatchConfig,
  inningsNum: 1 | 2,
  live: LiveInnings,
  eventId: string,
  replacement: BallEvent
): LiveInnings | null {
  const idx = live.events.findIndex((e) => e.id === eventId);
  if (idx < 0) return null;
  const pairLookup = buildPairLookup(live);
  const opening =
    pairLookup.get(1) ??
    (live.currentPairNumber === 1
      ? live.currentPairPlayerIds
      : live.completedPairs[0]?.playerIds);
  if (!opening?.[0] || !opening[1]) return null;

  const edited = live.events.map((e, i) => (i === idx ? replacement : e));
  return replayInningsFromEvents(
    config,
    inningsNum,
    live.battingSide,
    opening,
    edited,
    pairLookup
  );
}

/** Synthesize replacement using scoring helpers (preserves id/at). */
export function synthesizeAtInnings(
  inn: LiveInnings,
  config: MatchConfig,
  inningsNum: 1 | 2,
  original: BallEvent,
  edit: DeliveryEdit
): BallEvent | null {
  if (isExtraWicketEvent(original) && edit.kind === "wicket") {
    return replayExtraWicketFromEvent(inn, config, inningsNum, original);
  }
  return synthesizeDeliveryEvent(inn, config, inningsNum, original, edit);
}

export function isExtraWicketEvent(e: BallEvent): boolean {
  return e.kind === "wicket" && e.isLegalDelivery === false && !!e.extraType;
}

export function replayExtraWicketFromEvent(
  inn: LiveInnings,
  config: MatchConfig,
  inningsNum: 1 | 2,
  original: BallEvent
): BallEvent | null {
  if (!original.wicket || !original.extraType) return null;
  const next = addExtraWicket(
    inn,
    inningsNum,
    config,
    original.extraType,
    original.wicket
  );
  const generated = next.events.slice(inn.events.length);
  const ev = generated.find((x) => x.kind === "wicket");
  if (!ev) return null;
  return { ...ev, id: original.id, at: original.at, innings: original.innings };
}
