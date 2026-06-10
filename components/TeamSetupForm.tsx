"use client";

import { useMatchStore } from "@/lib/store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputSm =
  "rounded-md border border-zinc-300 bg-white px-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900";
const btnSm =
  "rounded-md px-2 py-1 text-[10px] font-semibold active:scale-[0.99]";

function TeamBlock({
  label,
  teamName,
  onTeamNameChange,
  players,
  onPlayerName,
}: {
  label: string;
  teamName: string;
  onTeamNameChange: (name: string) => void;
  players: { id: string; name: string }[];
  onPlayerName: (index: number, name: string) => void;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-zinc-200 bg-white p-1.5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex items-center gap-1">
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <input
          className={`${inputSm} h-7 min-w-0 flex-1 font-semibold`}
          value={teamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          placeholder="Team name"
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-5 gap-0.5">
        {players.map((p, i) => (
          <input
            key={p.id}
            className={`${inputSm} h-7`}
            placeholder={`${i + 1}`}
            value={p.name}
            onChange={(e) => onPlayerName(i, e.target.value)}
            autoComplete="off"
          />
        ))}
      </div>
    </section>
  );
}

function RadioGroup({
  legend,
  name,
  value,
  onChange,
  labels,
}: {
  legend: string;
  name: string;
  value: "a" | "b";
  onChange: (side: "a" | "b") => void;
  labels: { a: string; b: string };
}) {
  return (
    <fieldset className="min-w-0 rounded-lg border border-zinc-200 px-1.5 py-1 dark:border-zinc-800">
      <legend className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
        {legend}
      </legend>
      <div className="mt-0.5 flex gap-2">
        {(["a", "b"] as const).map((s) => (
          <label
            key={s}
            className="flex min-w-0 flex-1 items-center gap-1 text-[10px] leading-tight"
          >
            <input
              type="radio"
              name={name}
              checked={value === s}
              onChange={() => onChange(s)}
              className="h-3 w-3 shrink-0"
            />
            <span className="truncate">{labels[s]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

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

  const teamALabel = setup.teamAName.trim() || "Team A";
  const teamBLabel = setup.teamBName.trim() || "Team B";

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="flex shrink-0 items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => {
            loadSampleMatch();
            router.push("/setup/pairs");
          }}
          className={`${btnSm} border border-dashed border-emerald-400 text-emerald-800 dark:text-emerald-300`}
        >
          Sample
        </button>
        <Link
          href="/"
          className={`${btnSm} border border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-400`}
        >
          Home
        </Link>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-1.5">
        <TeamBlock
          label="A"
          teamName={setup.teamAName}
          onTeamNameChange={(teamAName) => updateSetup({ teamAName })}
          players={setup.playersA}
          onPlayerName={(i, name) => setPlayerName("a", i, name)}
        />
        <TeamBlock
          label="B"
          teamName={setup.teamBName}
          onTeamNameChange={(teamBName) => updateSetup({ teamBName })}
          players={setup.playersB}
          onPlayerName={(i, name) => setPlayerName("b", i, name)}
        />
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-1">
        <RadioGroup
          legend="Toss"
          name="toss"
          value={setup.tossWinner}
          onChange={(tossWinner) => updateSetup({ tossWinner })}
          labels={{ a: teamALabel, b: teamBLabel }}
        />
        <RadioGroup
          legend="Bat first"
          name="bat"
          value={setup.batFirst}
          onChange={(batFirst) => updateSetup({ batFirst })}
          labels={{ a: teamALabel, b: teamBLabel }}
        />
        <label className="flex min-w-0 flex-col rounded-lg border border-zinc-200 px-1.5 py-1 dark:border-zinc-800">
          <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
            Overs
          </span>
          <input
            type="number"
            min={1}
            max={120}
            inputMode="numeric"
            className={`${inputSm} mt-0.5 h-7 w-full`}
            value={setup.maxOvers}
            onChange={(e) =>
              updateSetup({ maxOvers: Number(e.target.value) || 1 })
            }
          />
        </label>
      </div>

      {error && (
        <p className="shrink-0 rounded-md bg-red-100 px-2 py-1 text-[10px] text-red-900 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="mt-auto h-10 shrink-0 rounded-xl bg-emerald-600 text-sm font-bold text-white shadow active:scale-[0.99]"
      >
        Continue to pairs
      </button>
    </div>
  );
}
