"use client";

import { buildMatchDbSnapshot } from "@/lib/db/build-snapshot";
import { useMatchStore } from "@/lib/store";
import { useEffect, useRef } from "react";

const DEBOUNCE_MS = 700;

/**
 * Persists match state to SQLite while scoring (debounced).
 * Only this device's scorerToken may write; viewers poll GET /api/matches/live.
 */
export function LiveScoreDbSync() {
  const hydrated = useMatchStore((s) => s.hydrated);
  const phase = useMatchStore((s) => s.phase);
  const config = useMatchStore((s) => s.config);
  const inningsNumber = useMatchStore((s) => s.inningsNumber);
  const innings1Result = useMatchStore((s) => s.innings1Result);
  const live = useMatchStore((s) => s.live);
  const innings2Result = useMatchStore((s) => s.innings2Result);
  const matchSessionId = useMatchStore((s) => s.matchSessionId);
  const scorerToken = useMatchStore((s) => s.scorerToken);
  const setScoringLocked = useMatchStore((s) => s.setScoringLocked);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastJson = useRef<string>("");
  const inflight = useRef(false);

  useEffect(() => {
    if (!hydrated || !matchSessionId || !scorerToken) return;

    const flush = async () => {
      const snapshot = buildMatchDbSnapshot({
        phase,
        config,
        inningsNumber,
        innings1Result,
        live,
        innings2Result,
        matchSessionId,
      });
      if (!snapshot) return;

      const json = JSON.stringify(snapshot);
      if (json === lastJson.current || inflight.current) return;

      inflight.current = true;
      try {
        const res = await fetch("/api/matches/live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            externalId: snapshot.matchSessionId,
            snapshot,
            scorerToken,
          }),
        });
        if (res.status === 409) {
          setScoringLocked(true);
          return;
        }
        if (res.ok) {
          lastJson.current = json;
          setScoringLocked(false);
        }
      } catch {
        /* retry on next state change */
      } finally {
        inflight.current = false;
      }
    };

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flush();
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [
    hydrated,
    phase,
    config,
    inningsNumber,
    innings1Result,
    live,
    innings2Result,
    matchSessionId,
    scorerToken,
    setScoringLocked,
  ]);

  return null;
}
