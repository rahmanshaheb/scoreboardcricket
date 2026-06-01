"use client";

import { HydrationGate } from "@/components/HydrationGate";
import { PublicScoreboard } from "@/components/PublicScoreboard";

export default function ScoreboardPage() {
  return (
    <HydrationGate>
      <PublicScoreboard />
    </HydrationGate>
  );
}
