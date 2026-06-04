"use client";

import { PublicScoreboard } from "@/components/PublicScoreboard";

/** Live scoreboard for a shared match id (polls the server). */
export function MatchScoreboardGate({ matchId }: { matchId: string }) {
  return <PublicScoreboard externalId={matchId} />;
}
