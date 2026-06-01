"use client";

import { PublicScoreboard } from "@/components/PublicScoreboard";
import { useMatchStore } from "@/lib/store";
import type { AppPhase } from "@/lib/types";
import Link from "next/link";

const PRE_MATCH: AppPhase[] = ["home", "setup_teams", "setup_pairs"];

/** Expect parent `HydrationGate` so store is rehydrated before render. */
export function MatchScoreboardGate({ matchId }: { matchId: string }) {
  const matchSessionId = useMatchStore((s) => s.matchSessionId);
  const phase = useMatchStore((s) => s.phase);

  const inMatch = !PRE_MATCH.includes(phase);
  if (
    inMatch &&
    matchSessionId != null &&
    matchId !== "" &&
    matchId !== matchSessionId
  ) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-zinc-100">
        <p className="max-w-md text-lg text-zinc-300">
          This scoreboard link is for a different match than the one loaded on
          this device.
        </p>
        <Link
          href="/scoreboard"
          className="text-sm font-semibold text-emerald-400 underline"
        >
          Open live scoreboard
        </Link>
        <Link href="/" className="text-sm text-zinc-500 underline">
          Home
        </Link>
      </div>
    );
  }

  return <PublicScoreboard />;
}
