import type { MatchDbSnapshot } from "@/lib/db/match-snapshot";
import { parseSnapshotJson } from "@/lib/match-view";
import { prisma } from "@/lib/prisma";
import { getLiveMatchSnapshot } from "@/lib/db/save-live-match";
import { rebuildSnapshotFromArchive } from "@/lib/db/rebuild-snapshot-from-archive";

export type MatchSnapshotRow = {
  status: string;
  teamAName: string;
  teamBName: string;
  updatedAt: Date;
  stateJson: string;
};

/** Live session first; rebuild from finished archive if needed. */
export async function getMatchSnapshotRow(
  externalId: string
): Promise<MatchSnapshotRow | null> {
  const live = await getLiveMatchSnapshot(externalId);
  if (live?.stateJson) {
    const snap = parseSnapshotJson(live.stateJson);
    if (snap) return live;
  }

  const archived = await prisma.match.findUnique({
    where: { externalId },
    include: { innings: { orderBy: { inningsNumber: "asc" } } },
  });
  if (!archived || archived.innings.length < 2) return null;

  const rebuilt = rebuildSnapshotFromArchive(archived);
  if (!rebuilt) return null;

  await upsertCompletedLiveSnapshot(rebuilt);

  return {
    status: "completed",
    teamAName: archived.teamAName,
    teamBName: archived.teamBName,
    updatedAt: archived.completedAt,
    stateJson: JSON.stringify(rebuilt),
  };
}

/** Persist summary snapshot so finished matches stay shareable / editable. */
export async function upsertCompletedLiveSnapshot(
  snapshot: MatchDbSnapshot
): Promise<void> {
  const stateJson = JSON.stringify(snapshot);
  await prisma.liveMatchSession.upsert({
    where: { externalId: snapshot.matchSessionId },
    create: {
      externalId: snapshot.matchSessionId,
      status: "completed",
      teamAName: snapshot.config.teamA.name,
      teamBName: snapshot.config.teamB.name,
      stateJson,
      scorerToken: null,
      scorerHeartbeat: null,
    },
    update: {
      status: "completed",
      teamAName: snapshot.config.teamA.name,
      teamBName: snapshot.config.teamB.name,
      stateJson,
      scorerToken: null,
      scorerHeartbeat: null,
    },
  });
}
