"use client";

import { PLAYERS_PER_TEAM } from "@/lib/constants";
import { useMatchStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeamSetupForm() {
  const router = useRouter();
  const setup = useMatchStore((s) => s.setup);
  const updateSetup = useMatchStore((s) => s.updateSetup);
  const setPlayerName = useMatchStore((s) => s.setPlayerName);
  const goToPairSetup = useMatchStore((s) => s.goToPairSetup);
  const loadSampleMatch = useMatchStore((s) => s.loadSampleMatch);
  const [error, setError] = useState<string | null>(null);

  const onContinue = () => {
    const err = goToPairSetup();
    setError(err);
    if (!err) router.push("/setup/pairs");
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter exactly ten players per team. You can assign pairs on the next step.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            loadSampleMatch();
            router.push("/setup/pairs");
          }}
          className="rounded-xl border border-dashed border-emerald-400 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
        >
          Fill sample data
        </button>
        <Link
          href="/"
          className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
        >
          Back home
        </Link>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Team A name
        </span>
        <input
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-base dark:border-zinc-600 dark:bg-zinc-900"
          value={setup.teamAName}
          onChange={(e) => updateSetup({ teamAName: e.target.value })}
          placeholder="e.g. North XI"
          autoComplete="off"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Team B name
        </span>
        <input
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-base dark:border-zinc-600 dark:bg-zinc-900"
          value={setup.teamBName}
          onChange={(e) => updateSetup({ teamBName: e.target.value })}
          placeholder="e.g. South XI"
          autoComplete="off"
        />
      </label>

      <fieldset className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase text-zinc-500">
          Toss won by
        </legend>
        <div className="mt-2 flex gap-3">
          {(["a", "b"] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="toss"
                checked={setup.tossWinner === s}
                onChange={() => updateSetup({ tossWinner: s })}
              />
              {s === "a"
                ? setup.teamAName.trim() || "Team A"
                : setup.teamBName.trim() || "Team B"}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-xs font-semibold uppercase text-zinc-500">
          Bat first
        </legend>
        <div className="mt-2 flex gap-3">
          {(["a", "b"] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bat"
                checked={setup.batFirst === s}
                onChange={() => updateSetup({ batFirst: s })}
              />
              {s === "a"
                ? setup.teamAName.trim() || "Team A"
                : setup.teamBName.trim() || "Team B"}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Overs per innings
        </span>
        <input
          type="number"
          min={1}
          max={120}
          inputMode="numeric"
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-base dark:border-zinc-600 dark:bg-zinc-900"
          value={setup.maxOvers}
          onChange={(e) =>
            updateSetup({ maxOvers: Number(e.target.value) || 1 })
          }
        />
      </label>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Team A players ({PLAYERS_PER_TEAM})
        </h2>
        <div className="grid gap-2">
          {setup.playersA.map((p, i) => (
            <input
              key={p.id}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base dark:border-zinc-600 dark:bg-zinc-900"
              placeholder={`Player ${i + 1}`}
              value={p.name}
              onChange={(e) => setPlayerName("a", i, e.target.value)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
          Team B players ({PLAYERS_PER_TEAM})
        </h2>
        <div className="grid gap-2">
          {setup.playersB.map((p, i) => (
            <input
              key={p.id}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base dark:border-zinc-600 dark:bg-zinc-900"
              placeholder={`Player ${i + 1}`}
              value={p.name}
              onChange={(e) => setPlayerName("b", i, e.target.value)}
            />
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-lg active:scale-[0.99]"
      >
        Continue to pairs
      </button>
    </div>
  );
}
