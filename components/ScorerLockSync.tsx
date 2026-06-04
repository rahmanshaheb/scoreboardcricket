"use client";

import { isScorerLockActive } from "@/lib/scorer-lock";
import { useMatchStore } from "@/lib/store";
import { useEffect } from "react";

/** Detect if another device holds the scorer lock (read-only scoring UI). */
export function ScorerLockSync() {
  const hydrated = useMatchStore((s) => s.hydrated);
  const matchSessionId = useMatchStore((s) => s.matchSessionId);
  const scorerToken = useMatchStore((s) => s.scorerToken);
  const phase = useMatchStore((s) => s.phase);
  const setScoringLocked = useMatchStore((s) => s.setScoringLocked);

  useEffect(() => {
    if (!hydrated || !matchSessionId || !scorerToken) return;
    if (phase !== "live" && phase !== "innings_break") return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(
          `/api/matches/live?externalId=${encodeURIComponent(matchSessionId)}`,
          { cache: "no-store" }
        );
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as {
          scorerToken?: string | null;
          scorerHeartbeat?: string | null;
          updatedAt?: string;
        };
        const row = {
          scorerToken: data.scorerToken ?? null,
          scorerHeartbeat: data.scorerHeartbeat
            ? new Date(data.scorerHeartbeat)
            : null,
          updatedAt: new Date(data.updatedAt ?? Date.now()),
        };
        setScoringLocked(isScorerLockActive(row, scorerToken));
      } catch {
        /* ignore */
      }
    };

    void check();
    const id = setInterval(() => void check(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    hydrated,
    matchSessionId,
    scorerToken,
    phase,
    setScoringLocked,
  ]);

  return null;
}
