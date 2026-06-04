"use client";

import { AppShell } from "@/components/AppShell";
import { HydrationGate } from "@/components/HydrationGate";
import { LiveScoring } from "@/components/LiveScoring";
import { ScorerLockSync } from "@/components/ScorerLockSync";
import { PhaseRedirect } from "@/components/PhaseRedirect";
import { useMatchStore } from "@/lib/store";
import { useEffect } from "react";
import { PHASE_GUARD } from "@/lib/routes";

function ScorerSetup() {
  const ensureScorerToken = useMatchStore((s) => s.ensureScorerToken);
  const hydrated = useMatchStore((s) => s.hydrated);

  useEffect(() => {
    if (hydrated) ensureScorerToken();
  }, [hydrated, ensureScorerToken]);

  return <ScorerLockSync />;
}

export default function ScoringPage() {
  return (
    <AppShell title="Scoring" showThemeToggle>
      <HydrationGate>
        <PhaseRedirect allowed={PHASE_GUARD.live} />
        <ScorerSetup />
        <LiveScoring />
      </HydrationGate>
    </AppShell>
  );
}
