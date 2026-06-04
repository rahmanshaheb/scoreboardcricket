import { isMatchDbSnapshot } from "@/lib/db/match-snapshot";
import {
  getLiveMatchSnapshot,
  saveLiveMatchSnapshot,
} from "@/lib/db/save-live-match";
import { NextResponse } from "next/server";

/** Upsert in-progress match state (debounced from the scoring UI). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const snapshot = body.snapshot;
    if (!isMatchDbSnapshot(snapshot)) {
      return NextResponse.json({ error: "Invalid snapshot" }, { status: 400 });
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

    const result = await saveLiveMatchSnapshot(snapshot);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save live match" },
      { status: 500 }
    );
  }
}

/** Load live snapshot by matchSessionId (for recovery / shared scoreboard). */
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
