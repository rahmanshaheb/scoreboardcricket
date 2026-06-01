import { AppShell } from "@/components/AppShell";
import {
  getPlayerLeaderboard,
  listRecentMatches,
} from "@/lib/db/queries";
import { oversFormat } from "@/lib/scoring";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  let matches: Awaited<ReturnType<typeof listRecentMatches>> = [];
  let players: Awaited<ReturnType<typeof getPlayerLeaderboard>> = [];
  let error: string | null = null;

  try {
    [matches, players] = await Promise.all([
      listRecentMatches(40),
      getPlayerLeaderboard(60),
    ]);
  } catch (e) {
    console.error(e);
    error =
      "Could not read the database. Run `npx prisma db push` and ensure DATABASE_URL is set (see .env.example).";
  }

  return (
    <AppShell title="Records">
      <div className="space-y-8">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Local SQLite history: finished matches and partnership-based player
          totals (each pair row counts toward both batters).
        </p>

        {error && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            {error}
          </div>
        )}

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">
            Player records
          </h2>
          {players.length === 0 && !error ? (
            <p className="text-sm text-zinc-500">No saved matches yet.</p>
          ) : (
            <ul className="space-y-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {players.map((p, i) => (
                <li
                  key={p.nameKey}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-100 px-3 py-2.5 last:border-0 dark:border-zinc-800"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    <span className="mr-2 tabular-nums text-zinc-400">
                      {i + 1}.
                    </span>
                    {p.displayName}
                  </span>
                  <span className="tabular-nums text-sm text-zinc-600 dark:text-zinc-400">
                    {p.partnershipRuns} partnership runs · {p.partnershipWickets}{" "}
                    w (pairs) · {p.matchesPlayed} match
                    {p.matchesPlayed === 1 ? "" : "es"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">
            Score records (matches)
          </h2>
          {matches.length === 0 && !error ? (
            <p className="text-sm text-zinc-500">No finished matches saved.</p>
          ) : (
            <ul className="space-y-3">
              {matches.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {m.teamAName} vs {m.teamBName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(m.completedAt).toLocaleString()} ·{" "}
                        {m.maxOvers} overs
                      </p>
                    </div>
                    <p className="max-w-[14rem] text-right text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {m.headline}
                    </p>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {m.innings.map((inn) => (
                      <li key={inn.id} className="tabular-nums">
                        Inns {inn.inningsNumber} ({inn.battingSide === "a" ? m.teamAName : m.teamBName}
                        ): {inn.runs}/{inn.wicketEvents} —{" "}
                        {oversFormat(inn.legalBalls)} ov · penalties{" "}
                        {inn.wicketPenaltyRuns} runs
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
        >
          ← Home
        </Link>
      </div>
    </AppShell>
  );
}
