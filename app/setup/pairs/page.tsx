"use client";

import { AppShell } from "@/components/AppShell";
import { HydrationGate } from "@/components/HydrationGate";
import { PairAssignment } from "@/components/PairAssignment";
import { PhaseRedirect } from "@/components/PhaseRedirect";
import { PHASE_GUARD } from "@/lib/routes";

export default function SetupPairsPage() {
  return (
    <AppShell title="Pairs">
      <HydrationGate>
        <PhaseRedirect allowed={PHASE_GUARD.setupPairs} />
        <PairAssignment />
      </HydrationGate>
    </AppShell>
  );
}
