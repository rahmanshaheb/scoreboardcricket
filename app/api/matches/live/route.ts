import { isMatchDbSnapshot } from "@/lib/db/match-snapshot";
import {
  ScorerLockError,
  getLiveMatchSnapshot,
  releaseScorerLock,
  saveLiveMatchSnapshot,
} from "@/lib/db/save-live-match";
import { NextResponse } from "next/server";

/** Upsert in-progress match state (scorer device only). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const snapshot = body.snapshot;
    const scorerToken = body.scorerToken;
    if (!isMatchDbSnapshot(snapshot)) {
      return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
    }
    if (typeof scorerToken !== "string" || !scorerToken.trim()) {
      return NextResponse.json(
        { error: "scorerToken is required" },
        { status: 400 }
      );
    }
    if (
      body.externalId != null &&
      typeof body.externalId === "string" &&
      body.externalId !== snapshot.matchSessionId
    ) {
      return NextResponse.json(
        { error: "externalId must match snapshot.matchSessionId" },
        { status: 400 }
      );
    }

    const result = await saveLiveMatchSnapshot(snapshot, scorerToken.trim());
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ScorerLockError) {
      return NextResponse.json(
        { error: e.message, locked: true },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save live match" },
      { status: 500 }
    );
  }
}

/** Release scorer lock (scorer leaving / ending session). */
export async function DELETE(request: Request) {
  try {
    const externalId = new URL(request.url).searchParams.get("externalId");
    const scorerToken = new URL(request.url).searchParams.get("scorerToken");
    if (!externalId?.trim() || !scorerToken?.trim()) {
      return NextResponse.json(
        { error: "externalId and scorerToken are required" },
        { status: 400 }
      );
    }
    await releaseScorerLock(externalId.trim(), scorerToken.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to release lock" },
      { status: 500 }
    );
  }
}

/** Load live snapshot for scoreboard viewers. */
export async function GET(request: Request) {
  try {
    const externalId = new URL(request.url).searchParams.get("externalId");
    if (!externalId?.trim()) {
      return NextResponse.json(
        { error: "externalId query is required" },
        { status: 400 }
      );
    }
    const row = await getLiveMatchSnapshot(externalId.trim());
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load live match" },
      { status: 500 }
    );
  }
}
