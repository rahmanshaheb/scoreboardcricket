"use client";

import { HydrationGate } from "@/components/HydrationGate";
import { MatchScoreboardGate } from "@/components/MatchScoreboardGate";
import { useParams } from "next/navigation";

export default function MatchScoreboardByIdPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  return (
    <HydrationGate>
      <MatchScoreboardGate matchId={id} />
    </HydrationGate>
  );
}
