"use client";

import { AppShell } from "@/components/AppShell";
import { HydrationGate } from "@/components/HydrationGate";
import { PhaseRedirect } from "@/components/PhaseRedirect";
import { TeamSetupForm } from "@/components/TeamSetupForm";
import { PHASE_GUARD } from "@/lib/routes";

export default function SetupTeamsPage() {
  return (
    <AppShell title="Teams" compact hideNav>
      <HydrationGate>
        <div className="flex h-full min-h-0 flex-col">
          <PhaseRedirect allowed={PHASE_GUARD.setupFlow} />
          <TeamSetupForm />
        </div>
      </HydrationGate>
    </AppShell>
  );
}
