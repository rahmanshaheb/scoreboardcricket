"use client";

import { buildMatchDbSnapshot } from "@/lib/db/build-snapshot";
import { useMatchStore } from "@/lib/store";
import { useEffect, useRef } from "react";

const DEBOUNCE_MS = 700;

/**
 * Persists match state to SQLite while scoring (debounced).
 * Finished matches are still archived via MatchDbSync on the summary screen.
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

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastJson = useRef<string>("");
  const inflight = useRef(false);

  useEffect(() => {
    if (!hydrated) return;

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
          }),
        });
        if (res.ok) {
          lastJson.current = json;
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
  ]);

  return null;
}
