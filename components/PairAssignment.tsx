"use client";

import { useMatchStore } from "@/lib/store";
import type { Player } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function SlotSelect({
  label,
  players,
  value,
  onChange,
}: {
  label: string;
  players: Player[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block text-xs text-zinc-500">
      {label}
      <select
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white py-2 pl-2 pr-8 text-base dark:border-zinc-600 dark:bg-zinc-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose…</option>
        {players.map((pl) => (
          <option key={pl.id} value={pl.id}>
            {pl.name || "Unnamed"}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PairAssignment() {
  const router = useRouter();
  const setup = useMatchStore((s) => s.setup);
  const setOpeningPairSlot = useMatchStore((s) => s.setOpeningPairSlot);
  const startMatch = useMatchStore((s) => s.startMatch);
  const [error, setError] = useState<string | null>(null);

  const onStart = () => {
    const err = startMatch();
    setError(err);
    if (!err) router.push("/scoring");
  };

  const teamA = setup.teamAName.trim() || "Team A";
  const teamB = setup.teamBName.trim() || "Team B";
  const bf = setup.batFirst;

  if (!bf) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Go back to team setup and choose who bats first.
      </p>
    );
  }

  const battingName = bf === "a" ? teamA : teamB;
  const players = bf === "a" ? setup.playersA : setup.playersB;
  const open = bf === "a" ? setup.openingPairA : setup.openingPairB;
  const p1 = open?.[0] ?? "";
  const p2 = open?.[1] ?? "";

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Only the <strong>opening pair</strong> is chosen now (two players). After
        every four overs, you will pick the next pair from the remaining players.
        The other team’s opening pair is selected at the innings break.
      </p>

      <Link
        href="/setup"
        className="inline-block rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
      >
        ← Edit teams
      </Link>

      <section>
        <h2 className="mb-3 text-sm font-bold text-emerald-800 dark:text-emerald-300">
          {battingName} — opening pair (Pair 1)
        </h2>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="grid gap-3">
            <SlotSelect
              label="Batter 1"
              players={players}
              value={p1}
              onChange={(id) => setOpeningPairSlot(bf, 0, id)}
            />
            <SlotSelect
              label="Batter 2"
              players={players}
              value={p2}
              onChange={(id) => setOpeningPairSlot(bf, 1, id)}
            />
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg active:scale-[0.99]"
      >
        Start match
      </button>
    </div>
  );
}
