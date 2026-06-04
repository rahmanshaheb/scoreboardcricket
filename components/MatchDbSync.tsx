"use client";

import { computeOutcome } from "@/lib/match-result";
import { useMatchStore } from "@/lib/store";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Saves the finished match to SQLite (Prisma) once per matchSessionId.
 * Shows status + retry if the server or DB is unavailable.
 */
export function MatchDbSync() {
  const config = useMatchStore((s) => s.config);
  const first = useMatchStore((s) => s.innings1Result);
  const second = useMatchStore((s) => s.innings2Result);
  const matchSavedToDb = useMatchStore((s) => s.matchSavedToDb);
  const markMatchSavedToDb = useMatchStore((s) => s.markMatchSavedToDb);
  const ensureMatchSessionForArchive = useMatchStore(
    (s) => s.ensureMatchSessionForArchive
  );

  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  const save = useCallback(async () => {
    if (!config || !first || !second) {
      setStatus("error");
      setMessage("Missing match data.");
      return;
    }
    ensureMatchSessionForArchive();
    const sid = useMatchStore.getState().matchSessionId;
    if (!sid) {
      setStatus("error");
      setMessage("Could not create session id.");
      return;
    }
    setStatus("saving");
    setMessage(null);
    try {
      const outcome = computeOutcome(config, first, second);
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId: sid,
          config,
          first,
          second,
          headline: outcome.headline,
          detail: outcome.detail,
          winnerSide: outcome.winner,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        duplicate?: boolean;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? `HTTP ${res.status}`);
        return;
      }
      markMatchSavedToDb();
      setStatus("saved");
      setMessage(
        data.duplicate
          ? "Already in database."
          : "Saved to match history."
      );
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Network error");
    }
  }, [
    config,
    first,
    second,
    ensureMatchSessionForArchive,
    markMatchSavedToDb,
  ]);

  useEffect(() => {
    if (!config || !first || !second || matchSavedToDb) {
      if (matchSavedToDb) {
        setStatus("saved");
        setMessage("Saved to match history.");
      }
      return;
    }
    if (attempted.current) return;
    attempted.current = true;
    void save();
  }, [config, first, second, matchSavedToDb, save]);

  if (!config || !first || !second) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        Database
      </p>
      <p className="mt-2 text-zinc-700 dark:text-zinc-300">
        {status === "idle" && "Preparing to save…"}
        {status === "saving" && "Saving score record…"}
        {status === "saved" && (message ?? "Saved.")}
        {status === "error" && (
          <>
            Could not save:{" "}
            <span className="font-medium text-red-600 dark:text-red-400">
              {message}
            </span>
          </>
        )}
      </p>
      {!matchSavedToDb && status === "error" && (
        <button
          type="button"
          onClick={() => {
            attempted.current = false;
            void save();
          }}
          className="mt-3 h-11 w-full rounded-xl bg-zinc-900 text-sm font-semibold text-white dark:bg-emerald-700"
        >
          Retry save
        </button>
      )}
      <p className="mt-2 text-xs text-zinc-500">
        Live scoring is saved during the match; this step stores the final
        result and pair stats in SQLite (see /records).
      </p>
    </div>
  );
}
