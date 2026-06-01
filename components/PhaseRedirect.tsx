"use client";

import { pathForPhase } from "@/lib/routes";
import { useMatchStore } from "@/lib/store";
import type { AppPhase } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * When the persisted phase does not match this page, send the user to the right route.
 */
export function PhaseRedirect({ allowed }: { allowed: readonly AppPhase[] }) {
  const router = useRouter();
  const phase = useMatchStore((s) => s.phase);
  const hydrated = useMatchStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!allowed.includes(phase)) {
      router.replace(pathForPhase(phase));
    }
  }, [hydrated, phase, allowed, router]);

  return null;
}
