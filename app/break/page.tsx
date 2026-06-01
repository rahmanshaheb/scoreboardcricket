"use client";

import { AppShell } from "@/components/AppShell";
import { HydrationGate } from "@/components/HydrationGate";
import { InningsBreakPanel } from "@/components/InningsBreakPanel";
import { PhaseRedirect } from "@/components/PhaseRedirect";
import { PHASE_GUARD } from "@/lib/routes";

export default function BreakPage() {
  return (
    <AppShell title="Break">
      <HydrationGate>
        <PhaseRedirect allowed={PHASE_GUARD.inningsBreak} />
        <InningsBreakPanel />
      </HydrationGate>
    </AppShell>
  );
}
