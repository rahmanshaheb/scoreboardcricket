"use client";

import { AppShell } from "@/components/AppShell";
import { HydrationGate } from "@/components/HydrationGate";
import { PhaseRedirect } from "@/components/PhaseRedirect";
import { TeamSetupForm } from "@/components/TeamSetupForm";
import { PHASE_GUARD } from "@/lib/routes";

export default function SetupTeamsPage() {
  return (
    <AppShell title="Teams">
      <HydrationGate>
        <PhaseRedirect allowed={PHASE_GUARD.setupFlow} />
        <TeamSetupForm />
      </HydrationGate>
    </AppShell>
  );
}
