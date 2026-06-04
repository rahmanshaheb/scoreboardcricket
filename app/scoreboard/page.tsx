"use client";

import { HydrationGate } from "@/components/HydrationGate";
import { PublicScoreboard } from "@/components/PublicScoreboard";
import { useMatchStore } from "@/lib/store";
import type { AppPhase } from "@/lib/types";

const IN_MATCH: AppPhase[] = ["live", "innings_break", "summary"];

export default function ScoreboardPage() {
  const matchSessionId = useMatchStore((s) => s.matchSessionId);
  const phase = useMatchStore((s) => s.phase);
  const externalId =
    matchSessionId && IN_MATCH.includes(phase) ? matchSessionId : null;

  return (
    <HydrationGate>
      <PublicScoreboard externalId={externalId} />
    </HydrationGate>
  );
}
