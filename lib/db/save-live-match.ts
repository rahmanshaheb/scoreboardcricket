import type { MatchDbSnapshot } from "@/lib/db/match-snapshot";
import { prisma } from "@/lib/prisma";

/** Upsert live scoring state (called during the match). */
export async function saveLiveMatchSnapshot(snapshot: MatchDbSnapshot) {
  if (!prisma.liveMatchSession) {
    throw new Error(
      "Database client is out of date. Run `npx prisma generate` and restart the dev server."
    );
  }

  const stateJson = JSON.stringify(snapshot);
  const teamAName = snapshot.config.teamA.name;
  const teamBName = snapshot.config.teamB.name;

  const row = await prisma.liveMatchSession.upsert({
    where: { externalId: snapshot.matchSessionId },
    create: {
      externalId: snapshot.matchSessionId,
      status: "live",
      teamAName,
      teamBName,
      stateJson,
    },
    update: {
      status: "live",
      teamAName,
      teamBName,
      stateJson,
    },
  });

  return { ok: true as const, id: row.id };
}

/** Mark live session finished after archive save. */
export async function completeLiveMatchSession(externalId: string) {
  await prisma.liveMatchSession.updateMany({
    where: { externalId, status: "live" },
    data: { status: "completed" },
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
    stateJson: row.stateJson,
  };
}
