"use client";

import { AppShell } from "@/components/AppShell";
import { ConfirmModal } from "@/components/ConfirmModal";
import { HydrationGate } from "@/components/HydrationGate";
import { MatchSummaryPanel } from "@/components/MatchSummaryPanel";
import { PhaseRedirect } from "@/components/PhaseRedirect";
import { PHASE_GUARD } from "@/lib/routes";
import { useMatchStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SummaryPage() {
  const router = useRouter();
  const resetAll = useMatchStore((s) => s.resetAll);
  const [open, setOpen] = useState(false);

  return (
    <AppShell title="Summary">
      <HydrationGate>
        <PhaseRedirect allowed={PHASE_GUARD.summary} />
        <div className="space-y-4">
          <MatchSummaryPanel />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-12 w-full rounded-xl border border-red-300 text-sm font-semibold text-red-700 dark:border-red-800 dark:text-red-300"
          >
            New match (reset)
          </button>
          <ConfirmModal
            open={open}
            title="Reset everything?"
            message="Clears this match and returns home. This cannot be undone."
            confirmLabel="Reset"
            danger
            onClose={() => setOpen(false)}
            onConfirm={() => {
              resetAll();
              router.push("/");
            }}
          />
        </div>
      </HydrationGate>
    </AppShell>
  );
}
