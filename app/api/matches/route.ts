import { saveFinishedMatch } from "@/lib/db/save-finished-match";
import { listRecentMatches } from "@/lib/db/queries";
import type { MatchConfig, LiveInnings, Side } from "@/lib/types";
import { NextResponse } from "next/server";

function isSide(x: unknown): x is Side {
  return x === "a" || x === "b";
}

function isLiveInnings(x: unknown): x is LiveInnings {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    isSide(o.battingSide) &&
    typeof o.runs === "number" &&
    typeof o.legalBalls === "number" &&
    typeof o.wicketEvents === "number" &&
    typeof o.wicketPenaltyRuns === "number" &&
    typeof o.currentPairNumber === "number" &&
    Array.isArray(o.currentPairPlayerIds) &&
    o.currentPairPlayerIds.length === 2 &&
    Array.isArray(o.completedPairs) &&
    typeof o.pairBlockLegalBalls === "number" &&
    typeof o.currentPairRuns === "number" &&
    typeof o.currentPairWicketEvents === "number" &&
    typeof o.awaitingNextPairSelection === "boolean" &&
    typeof o.awaitingBowlerSelection === "boolean" &&
    (o.lastCompletedOverBowlerPlayerId === null ||
      typeof o.lastCompletedOverBowlerPlayerId === "string") &&
    o.bowlerFigures != null &&
    typeof o.bowlerFigures === "object" &&
    typeof o.strikerIsFirst === "boolean" &&
    Array.isArray(o.events)
  );
}

function isMatchConfig(x: unknown): x is MatchConfig {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.teamA != null &&
    o.teamB != null &&
    typeof o.maxOvers === "number" &&
    isSide(o.tossWinner) &&
    isSide(o.batFirst)
  );
}

/** Persist a finished match from the summary screen (idempotent via externalId). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const externalId = body.externalId;
    if (typeof externalId !== "string" || !externalId.trim()) {
      return NextResponse.json(
        { error: "externalId is required" },
        { status: 400 }
      );
    }
    if (!isMatchConfig(body.config)) {
      return NextResponse.json({ error: "Invalid config" }, { status: 400 });
    }
    if (!isLiveInnings(body.first) || !isLiveInnings(body.second)) {
      return NextResponse.json({ error: "Invalid innings" }, { status: 400 });
    }
    const headline = body.headline;
    const detail = body.detail;
    if (typeof headline !== "string" || typeof detail !== "string") {
      return NextResponse.json(
        { error: "Invalid outcome strings" },
        { status: 400 }
      );
    }
    const ws = body.winnerSide;
    let winnerSide: Side | null = null;
    if (ws === null || ws === undefined) {
      winnerSide = null;
    } else if (isSide(ws)) {
      winnerSide = ws;
    } else {
      return NextResponse.json({ error: "Invalid winnerSide" }, { status: 400 });
    }

    const result = await saveFinishedMatch({
      externalId: externalId.trim(),
      config: body.config,
      first: body.first,
      second: body.second,
      headline,
      detail,
      winnerSide: winnerSide ?? null,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save match" },
      { status: 500 }
    );
  }
}

/** Optional JSON list for tools / future mobile clients. */
export async function GET() {
  try {
    const matches = await listRecentMatches(30);
    return NextResponse.json({ matches });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to list matches" },
      { status: 500 }
    );
  }
}
