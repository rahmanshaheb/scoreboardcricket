import { SCORER_LOCK_MS } from "@/lib/constants";
import type { MatchDbSnapshot } from "@/lib/db/match-snapshot";
import { prisma } from "@/lib/prisma";

export class ScorerLockError extends Error {
  constructor() {
    super("Another device is scoring this match.");
    this.name = "ScorerLockError";
  }
}

function lockHeldByOther(
  row: { scorerToken: string | null; scorerHeartbeat: Date | null; updatedAt: Date },
  scorerToken: string,
  now: Date
): boolean {
  if (!row.scorerToken || row.scorerToken === scorerToken) return false;
  const last = row.scorerHeartbeat ?? row.updatedAt;
  return now.getTime() - last.getTime() < SCORER_LOCK_MS;
}

/** Upsert live scoring state; only the active scorer token may write. */
export async function saveLiveMatchSnapshot(
  snapshot: MatchDbSnapshot,
  scorerToken: string
) {
  if (!prisma.liveMatchSession) {
    throw new Error(
      "Database client is out of date. Run `npx prisma generate` and restart the dev server."
    );
  }

  const now = new Date();
  const stateJson = JSON.stringify(snapshot);
  const teamAName = snapshot.config.teamA.name;
  const teamBName = snapshot.config.teamB.name;
  const externalId = snapshot.matchSessionId;

  const existing = await prisma.liveMatchSession.findUnique({
    where: { externalId },
  });

  if (existing && lockHeldByOther(existing, scorerToken, now)) {
    throw new ScorerLockError();
  }

  const row = await prisma.liveMatchSession.upsert({
    where: { externalId },
    create: {
      externalId,
      status: "live",
      teamAName,
      teamBName,
      stateJson,
      scorerToken,
      scorerHeartbeat: now,
    },
    update: {
      status: "live",
      teamAName,
      teamBName,
      stateJson,
      scorerToken,
      scorerHeartbeat: now,
    },
  });

  return { ok: true as const, id: row.id };
}

/** Release scorer lock when the owner leaves scoring. */
export async function releaseScorerLock(
  externalId: string,
  scorerToken: string
) {
  await prisma.liveMatchSession.updateMany({
    where: { externalId, scorerToken },
    data: { scorerToken: null, scorerHeartbeat: null },
  });
}

/** Mark live session finished after archive save. */
export async function completeLiveMatchSession(externalId: string) {
  await prisma.liveMatchSession.updateMany({
    where: { externalId, status: "live" },
    data: { status: "completed", scorerToken: null, scorerHeartbeat: null },
  });
}

export async function getLiveMatchSnapshot(externalId: string) {
  const row = await prisma.liveMatchSession.findUnique({
    where: { externalId },
  });
  if (!row) return null;
  return {
    status: row.status,
    teamAName: row.teamAName,
    teamBName: row.teamBName,
    updatedAt: row.updatedAt,
    scorerToken: row.scorerToken,
    scorerHeartbeat: row.scorerHeartbeat,
    stateJson: row.stateJson,
  };
}

