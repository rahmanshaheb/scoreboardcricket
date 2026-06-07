import { AppShell } from "@/components/AppShell";
import { MatchesLibrary } from "@/components/MatchesLibrary";
import { listMatchLibrary } from "@/lib/db/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  let matches: Awaited<ReturnType<typeof listMatchLibrary>> = [];
  let error: string | null = null;

  try {
    matches = await listMatchLibrary(60);
  } catch (e) {
    console.error(e);
    error =
      "Could not read the database. Run `npx prisma db push` and ensure DATABASE_URL is set.";
  }

  return (
    <AppShell title="Matches">
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          All saved matches — resume scoring, open the summary, or share the
          live scoreboard link.
        </p>

        {error && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            {error}
          </div>
        )}

        {!error && <MatchesLibrary matches={matches} />}

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
