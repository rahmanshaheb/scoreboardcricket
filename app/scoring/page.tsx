"use client";

import { AppShell } from "@/components/AppShell";
import { HydrationGate } from "@/components/HydrationGate";
import { LiveScoring } from "@/components/LiveScoring";
import { PhaseRedirect } from "@/components/PhaseRedirect";
import { PHASE_GUARD } from "@/lib/routes";

export default function ScoringPage() {
  return (
    <AppShell title="Scoring" showThemeToggle>
      <HydrationGate>
        <PhaseRedirect allowed={PHASE_GUARD.live} />
        <LiveScoring />
      </HydrationGate>
    </AppShell>
  );
}
