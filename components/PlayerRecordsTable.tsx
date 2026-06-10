import { oversFormat } from "@/lib/scoring";
import type { PlayerStatRow } from "@/lib/db/aggregate-player-stats";

function StatBox({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900 ${accent}`}
    >
      <h3 className="border-b border-inherit px-4 py-3 text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
        {title}
      </h3>
      <div className="px-2 py-1">{children}</div>
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="px-2 py-4 text-sm text-zinc-500">{text}</p>;
}

function PlayerRow({
  rank,
  name,
  children,
}: {
  rank: number;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-2 py-2.5 last:border-0 dark:border-zinc-800">
      <span className="min-w-0 font-medium text-zinc-900 dark:text-zinc-100">
        <span className="mr-2 tabular-nums text-zinc-400">{rank}.</span>
        {name}
      </span>
      <span className="shrink-0 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
        {children}
      </span>
    </div>
  );
}

export function PlayerRecordsTable({ players }: { players: PlayerStatRow[] }) {
  if (players.length === 0) {
    return <p className="text-sm text-zinc-500">No saved matches yet.</p>;
  }

  const batting = [...players].sort(
    (a, b) =>
      b.battingRuns - a.battingRuns ||
      b.matchesPlayed - a.matchesPlayed ||
      a.displayName.localeCompare(b.displayName)
  );

  const bowling = players
    .filter(
      (p) => p.ballsBowled > 0 || p.wicketsTaken > 0 || p.runsConceded > 0
    )
    .sort(
      (a, b) =>
        b.wicketsTaken - a.wicketsTaken ||
        b.ballsBowled - a.ballsBowled ||
        a.displayName.localeCompare(b.displayName)
    );

  const fielding = players
    .filter((p) => p.catches > 0 || p.runOuts > 0 || p.stumpings > 0)
    .sort(
      (a, b) =>
        b.catches + b.runOuts + b.stumpings -
          (a.catches + a.runOuts + a.stumpings) ||
        a.displayName.localeCompare(b.displayName)
    );

  return (
    <div className="grid gap-4">
      <StatBox
        title="Batting"
        accent="border-emerald-200 dark:border-emerald-900/60"
      >
        {batting.map((p, i) => (
          <PlayerRow key={p.nameKey} rank={i + 1} name={p.displayName}>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {p.battingRuns}
            </span>
            <span className="text-zinc-500"> r · </span>
            {p.battingWicketEvents} wk
          </PlayerRow>
        ))}
      </StatBox>

      <StatBox
        title="Bowling"
        accent="border-sky-200 dark:border-sky-900/60"
      >
        {bowling.length === 0 ? (
          <EmptyNote text="No bowling figures saved yet." />
        ) : (
          bowling.map((p, i) => (
            <PlayerRow key={p.nameKey} rank={i + 1} name={p.displayName}>
              {oversFormat(p.ballsBowled)} ov ·{" "}
              <span className="font-semibold text-sky-700 dark:text-sky-400">
                {p.wicketsTaken}
              </span>
              {" w · "}
              {p.runsConceded} r
            </PlayerRow>
          ))
        )}
      </StatBox>

      <StatBox
        title="Fielding"
        accent="border-amber-200 dark:border-amber-900/60"
      >
        {fielding.length === 0 ? (
          <EmptyNote text="No fielding dismissals saved yet." />
        ) : (
          fielding.map((p, i) => (
            <PlayerRow key={p.nameKey} rank={i + 1} name={p.displayName}>
              {p.catches > 0 && (
                <span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {p.catches}
                  </span>{" "}
                  ct
                </span>
              )}
              {p.catches > 0 && (p.runOuts > 0 || p.stumpings > 0) && (
                <span className="text-zinc-400"> · </span>
              )}
              {p.runOuts > 0 && (
                <span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {p.runOuts}
                  </span>{" "}
                  ro
                </span>
              )}
              {p.runOuts > 0 && p.stumpings > 0 && (
                <span className="text-zinc-400"> · </span>
              )}
              {p.stumpings > 0 && (
                <span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {p.stumpings}
                  </span>{" "}
                  st
                </span>
              )}
            </PlayerRow>
          ))
        )}
      </StatBox>
    </div>
  );
}
