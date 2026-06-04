"use client";

import { LIVE_MATCH_POLL_MS } from "@/lib/constants";
import { matchViewFromSnapshot, parseSnapshotJson } from "@/lib/match-view";
import type { MatchViewState } from "@/lib/match-view";
import { useEffect, useState } from "react";

type RemoteState = {
  view: MatchViewState | null;
  loading: boolean;
  notFound: boolean;
  updatedAt: string | null;
};

export function useRemoteMatch(externalId: string | null | undefined): RemoteState {
  const [view, setView] = useState<MatchViewState | null>(null);
  const [loading, setLoading] = useState(Boolean(externalId));
  const [notFound, setNotFound] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!externalId) {
      setView(null);
      setLoading(false);
      setNotFound(false);
      setUpdatedAt(null);
      return;
    }

    let cancelled = false;

    const pull = async () => {
      try {
        const res = await fetch(
          `/api/matches/live?externalId=${encodeURIComponent(externalId)}`,
          { cache: "no-store" }
        );
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          setView(null);
          setLoading(false);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          stateJson?: string;
          updatedAt?: string;
        };
        const snap = data.stateJson
          ? parseSnapshotJson(data.stateJson)
          : null;
        if (snap) {
          setView(matchViewFromSnapshot(snap));
          setNotFound(false);
        }
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    void pull();
    const id = setInterval(() => void pull(), LIVE_MATCH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [externalId]);

  return { view, loading, notFound, updatedAt };
}
